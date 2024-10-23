let settings = input.config({
    title: 'Auto Archive',
    description: `This script will automatically archive records from a master table into separate archived bases.
    You can specify the API key, archive frequency, and the workspace for base creation.`,
    items: [
        input.config.table('archiveMasterTable', {
            label: 'Master table',
            description: 'The main table you would like to auto-archive records from',
        }),
        input.config.text('apiKey', {
            label: 'Personal Access Token or API Key',
            description: '"On Behalf of" user access token that will create/manage archive Bases',
        }),
        input.config.select('frequency', {
            label: 'Archive Frequency',
            description: 'Select the frequency of auto-archive',
            options: [
                { label: 'Monthly', value: '1m' },
                { label: 'Quarterly', value: '3m' },
                { label: 'Semi-Yearly', value: '6m' },
                { label: 'Yearly', value: '12m' },
            ],
        }),
        input.config.text('workspaceId', {
            label: 'Workspace ID',
            description: 'The ID of the Airtable workspace where archive bases should be created',
        }),
    ]
});

let { archiveMasterTable, apiKey, frequency, workspaceId } = settings;

let archiveTrackingTableName = "Archive Base Tracking";  // Name of the table that will store archive base information
let logTableName = "Archive Process Logs";  // Name of the table that will store the archiving process logs
let archiveTrackingTable;
let logTable;

const archivedFieldName = "Archived";  // Name of the field to flag records as archived

// Step 1: Extract the base schema dynamically and remove any IDs or invalid options, exclude "Archived" field
let baseSchema = {
    "name": archiveMasterTable.name,
    "fields": archiveMasterTable.fields
        .filter(field => field.name !== archivedFieldName) // Exclude the "Archived" field
        .map(field => {
            let fieldSchema = {
                "type": field.type,
                "name": field.name,
                "description": field.description || "",
            };
            
            // Handle field-specific options, excluding IDs from selectable fields
            if (field.type === "checkbox") {
                fieldSchema["options"] = field.options;
            } else if (field.type === "singleSelect" || field.type === "multipleSelects") {
                fieldSchema["options"] = {
                    choices: field.options.choices.map(choice => ({
                        name: choice.name,
                        color: choice.color,
                    }))
                };
            } else if (field.type === "number") {
                fieldSchema["options"] = { precision: field.options.precision };
            } else if (field.type === "date") {
                fieldSchema["options"] = {
                    dateFormat: field.options.dateFormat || { name: "local", format: "l" }
                };
            } else if (field.type === "multipleAttachments") {
                delete fieldSchema.options;
            }

            return fieldSchema;
        })
};

// Step 2: Check if the archive tracking table exists, if not, create it
console.log("Checking if archive tracking table exists...");
let trackingTables = base.tables;
let trackingTableExists = trackingTables.some(table => table.name === archiveTrackingTableName);

if (!trackingTableExists) {
    console.log("Creating archive tracking table...");
    await base.createTableAsync(archiveTrackingTableName, [
        { name: 'Archive Key', type: 'singleLineText' },
        { name: 'Archive Name', type: 'singleLineText' },
        { name: 'Archive ID', type: 'singleLineText' },
        { name: 'Workspace ID', type: 'singleLineText' },
        { name: 'Link', type: 'url' },
        { name: 'Primary Table ID', type: 'singleLineText' }
    ]);
    console.log("Archive tracking table created.");
}
archiveTrackingTable = base.getTable(archiveTrackingTableName);
console.log("Archive tracking table found.");

// Step 3: Ensure the logging table exists, if not, create it
console.log("Checking if archive process log table exists...");
let logTableExists = trackingTables.some(table => table.name === logTableName);

if (!logTableExists) {
    console.log("Creating archive process log table...");
    await base.createTableAsync(logTableName, [
        { name: 'Run ID', type: 'singleLineText' },
        { name: 'Timestamp', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' }, timeZone: 'utc' }},
        { name: 'Status', type: 'singleSelect', options: { choices: [{ name: "Success", color: "greenLight1" }, { name: "Failure", color: "redBright" }, { name: "Partial Success", color: "orangeLight1" }]}},
        { name: 'Total Records Processed', type: 'number', options: { precision: 0 }},
        { name: 'Total Records Archived', type: 'number', options: { precision: 0 }},
        { name: 'Errors', type: 'multilineText' },
        { name: 'Execution Time (seconds)', type: 'number', options: { precision: 0 }},
        { name: 'Frequency Used', type: 'singleLineText' },
        { name: 'Base IDs Created/Updated', type: 'multilineText' },
        { name: 'Archived Periods', type: 'multilineText' }
    ]);
    console.log("Archive process log table created.");
}
logTable = base.getTable(logTableName);
console.log("Archive process log table found.");

// Step 4: Ensure the "Archived" field exists, create it if not
console.log(`Checking if the '${archivedFieldName}' field exists...`);
let masterTableFields = archiveMasterTable.fields.map(field => field.name);

if (!masterTableFields.includes(archivedFieldName)) {
    console.log(`Creating '${archivedFieldName}' field...`);
    await archiveMasterTable.createFieldAsync(archivedFieldName, 'checkbox', { color: 'greenBright', icon: 'check' });
    console.log(`Field '${archivedFieldName}' created.`);
}

// Step 5: Fetch all records and filter manually for unarchived ones
console.log("Fetching all records...");
let allRecords = await archiveMasterTable.selectRecordsAsync();
let unarchivedRecords = allRecords.records.filter(record => !record.getCellValue(archivedFieldName));
let totalRecordsProcessed = unarchivedRecords.length;
console.log(`Found ${unarchivedRecords.length} unarchived records.`);

// Generate unique run ID and start timer
let runId = `Run_${Date.now()}`;
let startTime = new Date();
let totalRecordsArchived = 0;
let errorLogs = [];
let baseIdsCreatedUpdated = [];
let archivedPeriods = [];

// If there are no unarchived records, stop processing early
if (unarchivedRecords.length === 0) {
    await logTable.createRecordAsync({
        "Run ID": runId,
        "Timestamp": startTime,
        "Status": { name: "Success" },
        "Total Records Processed": totalRecordsProcessed,
        "Total Records Archived": 0,
        "Errors": "",
        "Execution Time (seconds)": 0,
        "Frequency Used": frequency,
        "Base IDs Created/Updated": "",
        "Archived Periods": ""
    });
    console.log("No unarchived records to process. Exiting...");
    return;
}

// Function to generate dynamic base directory based on frequency
function generateBaseDirectory(records, frequency) {
    let baseDirectory = {};
    for (let record of records) {
        let recordDate = record.getCellValue("Date");
        if (recordDate) {
            let date = new Date(recordDate);
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let key;

            if (frequency === '1m') {
                key = `${year}_${String(month).padStart(2, '0')}`;
            } else if (frequency === '3m') {
                let quarter = Math.ceil(month / 3);
                key = `${year}_Q${quarter}`;
            } else if (frequency === '6m') {
                let half = month <= 6 ? 'H1' : 'H2';
                key = `${year}_${half}`;
            } else if (frequency === '12m') {
                key = `${year}`;
            }

            if (!baseDirectory[key]) {
                baseDirectory[key] = `Archive ${key}`;
            }
        }
    }
    return baseDirectory;
}

// Function to create a base if it doesn't exist and return its table ID
async function createBaseIfNotExist(baseName) {
    console.log(`Creating base: ${baseName}...`);
    try {
        let url = `https://api.airtable.com/v0/meta/bases`;
        let options = {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: baseName,
                tables: [{
                    name: archiveMasterTable.name,
                    fields: baseSchema.fields
                }],
                workspaceId: workspaceId
            })
        };
        let response = await fetch(url, options);
        let data = await response.json();
        console.log(`Base created: ${baseName} with ID ${data.id}`);

        let primaryTableId = data.tables[0].id;

        return { baseId: data.id, primaryTableId };
    } catch (error) {
        errorLogs.push(`Error creating base: ${baseName}, ${error}`);
        console.log(`Error creating base: ${error}`);
        return { baseId: null, primaryTableId: null };
    }
}

// Function to check if archive base already exists in tracking table
async function getExistingBaseId(archiveKey) {
    let query = await archiveTrackingTable.selectRecordsAsync();
    for (let record of query.records) {
        if (record.getCellValue("Archive Key") === archiveKey) {
            console.log(`Found existing base for key ${archiveKey}.`);
            return record.getCellValue("Archive ID");
        }
    }
    return null;
}

// Function to save new archive information in the tracking table
async function saveArchiveBaseInfo(archiveKey, baseId, baseName, primaryTableId) {
    console.log(`Saving new archive information: ${baseName} with ID ${baseId}`);
    await archiveTrackingTable.createRecordAsync({
        "Archive Key": archiveKey,
        "Archive Name": baseName,
        "Archive ID": baseId,
        "Workspace ID": workspaceId,
        "Link": `https://airtable.com/${baseId}`,
        "Primary Table ID": primaryTableId
    });
}

// Function to process field values, handling objects and extracting "name" when needed
function processFieldValue(fieldValue) {
    if (typeof fieldValue === 'object' && fieldValue !== null && fieldValue.name) {
        return fieldValue.name;
    }
    return fieldValue;  // Return the value as-is if it's not an object with 'name'
}


// Function to batch add records to a base and update the 'Archived' field in the master table
async function addRecordsToBaseInBatches(baseId, recordsBatch, fieldNames) {
    let recordsToCreate = recordsBatch.map(record => {
        let fields = {};
        fieldNames.forEach(fieldName => {
            if (fieldName !== archivedFieldName) {
                let fieldValue = record.getCellValue(fieldName);
                let field = archiveMasterTable.getField(fieldName);
                fields[fieldName] = processFieldValue(fieldValue, field);
            }
        });
        return { fields };
    });

    try {
        await fetch(`https://api.airtable.com/v0/${baseId}/${archiveMasterTable.name}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: recordsToCreate })
        });
        console.log(`Successfully added batch of ${recordsBatch.length} records to base ID ${baseId}`);
        // Increment the total archived records
        totalRecordsArchived += recordsBatch.length;
        
        let updates = recordsBatch.map(record => ({
            id: record.id,
            fields: { [archivedFieldName]: true }
        }));
        for (let i = 0; i < updates.length; i += 50) {
            let batch = updates.slice(i, i + 50);
            await archiveMasterTable.updateRecordsAsync(batch);
            console.log(`Updated 'Archived' field for ${batch.length} records in master table.`);
        }
    } catch (error) {
        errorLogs.push(`Error processing batch for base ${baseId}: ${error}`);
        console.log(`Error processing batch for base ${baseId}: ${error}`);
    }
}

// Main script logic
console.log("Generating base directory for unarchived records...");
let baseDirectory = generateBaseDirectory(unarchivedRecords, frequency);
let baseIds = {};
let recordCounts = {};

console.log("Creating all necessary archive bases...");
for (let key in baseDirectory) {
    let baseId = await getExistingBaseId(key);
    if (!baseId) {
        let baseName = baseDirectory[key];
        let { baseId, primaryTableId } = await createBaseIfNotExist(baseName);
        baseIds[key] = baseId;

        if (baseId && primaryTableId) {
            await saveArchiveBaseInfo(key, baseId, baseName, primaryTableId);
            archivedPeriods.push(key);
        }
    } else {
        baseIds[key] = baseId;
    }
}

console.log("Archiving unarchived records...");
for (let i = 0; i < unarchivedRecords.length; i += 10) {
    let batch = unarchivedRecords.slice(i, i + 10);
    let recordDate = batch[0].getCellValue("Date");
    let date = new Date(recordDate);
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let key = frequency === '1m' ? `${year}_${String(month).padStart(2, '0')}` :
              frequency === '3m' ? `${year}_Q${Math.ceil(month / 3)}` :
              frequency === '6m' ? month <= 6 ? `${year}_H1` : `${year}_H2` :
              `${year}`;
    await addRecordsToBaseInBatches(baseIds[key], batch, masterTableFields);
}

console.log("Summary of records added:");
for (let key in recordCounts) {
    console.log(`Archive ${key}: ${recordCounts[key]} records added.`);
}

let endTime = new Date();
let executionTime = (endTime - startTime) / 1000;

await logTable.createRecordAsync({
    "Run ID": runId,
    "Timestamp": startTime,
    "Status": errorLogs.length === 0 ? { name: "Success" } : { name: "Partial Success" },
    "Total Records Processed": totalRecordsProcessed,
    "Total Records Archived": totalRecordsArchived,
    "Errors": errorLogs.join('\n'),
    "Execution Time (seconds)": executionTime,
    "Frequency Used": frequency,
    "Base IDs Created/Updated": baseIdsCreatedUpdated.join('\n'),
    "Archived Periods": archivedPeriods.join('\n')
});

console.log("Archiving complete and process logged.");
