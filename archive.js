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
                // Include date-specific options without unsupported options
                fieldSchema["options"] = {
                    dateFormat: field.options.dateFormat || { name: "local", format: "l" }
                };
            } else if (field.type === "multipleAttachments") {
                // For multiple attachments, do not include options
                delete fieldSchema.options;
            }

            // Default handling for single-line text fields or others
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
        { name: 'Archive Key', type: 'singleLineText' },   // Key to match period (e.g., '2023_01', '2023_Q1')
        { name: 'Archive Name', type: 'singleLineText' },  // Name of the archive base
        { name: 'Archive ID', type: 'singleLineText' },    // ID of the archive base
        { name: 'Workspace ID', type: 'singleLineText' },   // Workspace ID for the base
        { name: 'Link', type: 'url' },  // link to base
        { name: 'Primary Table ID', type: 'singleLineText' } // New field for primary table ID
    ]);
    console.log("Archive tracking table created.");

    // Refresh reference after creation
    trackingTables = base.tables;
}
archiveTrackingTable = base.getTable(archiveTrackingTableName);
console.log("Archive tracking table found.");

// Step 3: Ensure the logging table exists, if not, create it
console.log("Checking if archive process log table exists...");
let logTableExists = trackingTables.some(table => table.name === logTableName);

if (!logTableExists) {
    console.log("Creating archive process log table...");
    await base.createTableAsync(logTableName, [
        { name: 'Run ID', type: 'singleLineText' },           // Unique identifier for the run
        { name: 'Timestamp', type: 'dateTime', options: {
            dateFormat: { name: 'iso' },    // ISO date format
            timeFormat: { name: '24hour' }, // 24-hour format
            timeZone: 'utc'                // Set timezone to UTC
        }},              // Timestamp for the run
        { name: 'Status', type: 'singleSelect', options: { 
            choices: [
                { name: "Success", color: "greenLight1" },
                { name: "Failure", color: "redBright" },
                { name: "Partial Success", color: "orangeLight1" }
            ] 
        }}, // Run status
        { name: 'Total Records Processed', type: 'number', options: { precision: 0 } },  // Total records processed
        { name: 'Total Records Archived', type: 'number', options: { precision: 0 } },   // Number of records archived
        { name: 'Errors', type: 'multilineText' },            // Errors encountered during the process
        { name: 'Execution Time (seconds)', type: 'number', options: { precision: 0 } }, // Execution time in seconds
        { name: 'Frequency Used', type: 'singleLineText' },   // Archive frequency used (e.g., "Monthly")
        { name: 'Base IDs Created/Updated', type: 'multilineText' }, // Base IDs created or updated
        { name: 'Archived Periods', type: 'multilineText' }  // Archived periods (e.g., "2023_Q1")
    ]);
    console.log("Archive process log table created.");

    // Refresh reference after creation
    trackingTables = base.tables;
}
logTable = base.getTable(logTableName);
console.log("Archive process log table found.");

// Step 4: Ensure the "Archived" field exists, create it if not
console.log(`Checking if the '${archivedFieldName}' field exists...`);
let masterTableFields = archiveMasterTable.fields.map(field => field.name);

if (!masterTableFields.includes(archivedFieldName)) {
    console.log(`Creating '${archivedFieldName}' field...`);
    await archiveMasterTable.createFieldAsync(archivedFieldName, 'checkbox', {
        color: 'greenBright',
        icon: 'check'
    });
    console.log(`Field '${archivedFieldName}' created.`);
} else {
    console.log(`Field '${archivedFieldName}' already exists.`);
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
        let recordDate = record.getCellValue("Date");  // Use getCellValue to retrieve the Date field
        if (recordDate) {
            let date = new Date(recordDate);
            let year = date.getFullYear();
            let month = date.getMonth() + 1;
            let key;

            if (frequency === '1m') {
                key = `${year}_${String(month).padStart(2, '0')}`;  // e.g., 2023_01 for January
            } else if (frequency === '3m') {
                let quarter = Math.ceil(month / 3);
                key = `${year}_Q${quarter}`;  // e.g., 2023_Q1 for first quarter
            } else if (frequency === '6m') {
                let half = month <= 6 ? 'H1' : 'H2';
                key = `${year}_${half}`;  // e.g., 2023_H1 for first half of the year
            } else if (frequency === '12m') {
                key = `${year}`;  // e.g., 2023 for the entire year
            }

            // Assign base names
            if (!baseDirectory[key]) {
                baseDirectory[key] = `Archive ${key}`;  // e.g., Archive 2023_H1
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
                    fields: baseSchema.fields  // Using the field structure from the base schema defined above
                }],
                workspaceId: workspaceId
            })
        };
        let response = await fetch(url, options);
        let data = await response.json();
        console.log(`Base created: ${baseName} with ID ${data.id}`);

        // Capture the primary table ID
        let primaryTableId = data.tables[0].id;  // Assuming the first table is the primary table

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

// Function to save new archive information in the tracking table, including Primary Table ID
async function saveArchiveBaseInfo(archiveKey, baseId, baseName, primaryTableId) {
    console.log(`Saving new archive information: ${baseName} with ID ${baseId}`);
    await archiveTrackingTable.createRecordAsync({
        "Archive Key": archiveKey,
        "Archive Name": baseName,
        "Archive ID": baseId,
        "Workspace ID": workspaceId,
        "Link": `https://airtable.com/${baseId}`,
        "Primary Table ID": primaryTableId // Store the Primary Table ID
    });
}

// Function to process field values, handling objects and extracting "name" when needed
function processFieldValue(fieldValue) {
    if (typeof fieldValue === 'object' && fieldValue !== null && fieldValue.name) {
        return fieldValue.name;
    }
    return fieldValue;  // Return the value as-is if it's not an object with 'name'
}

// Function to add records to a specific base and count the total records added
async function addRecordToBase(baseId, record, fieldNames, recordCounts, key) {
    try {
        let fields = {};
        
        // Exclude the 'Archived' field from being copied to the archive base
        fieldNames.forEach(fieldName => {
            if (fieldName !== archivedFieldName) {  // Skip the 'Archived' field
                let fieldValue = record.getCellValue(fieldName);
                fields[fieldName] = processFieldValue(fieldValue);
            }
        });

        let url = `https://api.airtable.com/v0/${baseId}/${archiveMasterTable.name}`;
        let options = {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields })
        };
        let response = await fetch(url, options);
        let data = await response.json();

        // Increment the record count for this archive base
        if (recordCounts[key]) {
            recordCounts[key] += 1;
        } else {
            recordCounts[key] = 1;
        }

        // Mark the record as archived by updating the 'Archived' field in the master table
        await archiveMasterTable.updateRecordAsync(record.id, {
            [archivedFieldName]: true
        });

        totalRecordsArchived++;
        console.log(`Record added to base ID ${baseId} and marked as archived.`);
        return data;
    } catch (error) {
        errorLogs.push(`Error adding record to base ${baseId}: ${error}`);
        console.log(`Error adding record to base ${baseId}: ${error}`);
    }
}

// Main script logic

// Step 1: Generate the full base directory for the range
console.log("Generating base directory for unarchived records...");
let baseDirectory = generateBaseDirectory(unarchivedRecords, frequency);  // Dynamically generate base directory
let baseIds = {};

// Initialize record counts for each archive base
let recordCounts = {};

// Step 2: Create all necessary bases first
console.log("Creating all necessary archive bases...");
for (let key in baseDirectory) {
    let baseId = await getExistingBaseId(key);
    if (!baseId) {
        let baseName = baseDirectory[key];
        let { baseId, primaryTableId } = await createBaseIfNotExist(baseName);
        console.log('the BASE ID')
        console.log(baseId)
        baseIds[key] = baseId;  // Store the base ID for future use

        if (baseId && primaryTableId) {
            await saveArchiveBaseInfo(key, baseId, baseName, primaryTableId);
            archivedPeriods.push(key);
        }
    }else {
    baseIds[key] = baseId;  // Store the base ID for future use

    }
}

// Step 3: Once all bases are created, add records to the respective archive bases
console.log("Archiving unarchived records...");
for (let record of unarchivedRecords) {
    let recordDate = record.getCellValue("Date");
    if (recordDate) {
        let date = new Date(recordDate);
        let year = date.getFullYear();
        let month = date.getMonth() + 1;

        // Determine the archive key based on the frequency
        let key;
        if (frequency === '1m') {
            key = `${year}_${String(month).padStart(2, '0')}`;
        } else if (frequency === '3m') {
            let quarter = Math.ceil(month / 3);
            key = `${year}_Q${quarter}`;
        } else if (frequency === '6m') {
            key = month <= 6 ? `${year}_H1` : `${year}_H2`;
        } else if (frequency === '12m') {
            key = `${year}`;
        }

        await addRecordToBase(baseIds[key], record, masterTableFields, recordCounts, key);
    }
}

// Step 4: Log the total number of records added to each archive base
console.log("Summary of records added:");
for (let key in recordCounts) {
    console.log(`Archive ${key}: ${recordCounts[key]} records added.`);
}

// Step 5: Finalize and save the log record for this run
let endTime = new Date();
let executionTime = (endTime - startTime) / 1000; // Convert to seconds

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
