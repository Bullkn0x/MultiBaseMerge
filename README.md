# Airtable Multi-Base Archiver & Data Explorer

This repository contains two main scripts designed for Airtable: the **Auto Archive Script** and the **Multi-Base Data Explorer** extension. These scripts work together to efficiently manage and explore large datasets by automatically archiving older records into new bases and enabling users to interact with and analyze these archives through a unified interface.

---

## Auto Archive Script

### Purpose

The **Auto Archive Script** automates the process of archiving old records from a master table into dynamically created archive bases. This helps manage Airtable's record limits by splitting data across different time-based bases (monthly, quarterly, etc.).

### Detailed Breakdown

The **Auto Archive Script** processes records from a designated master table, groups them by a specified time period (e.g., month or quarter), creates new Airtable bases to store archived records if needed, and updates the master table to mark the archived records.

```javascript
import { initializeBlock, useBase, useRecords, useCursor } from '@airtable/blocks/ui';

// Configuration
const archiveMasterTable = 'MasterTable';
const frequency = '1m'; // Frequency of archiving
const apiKey = 'your_airtable_api_key';
const workspaceId = 'your_workspace_id';

// Fetch records and filter out already archived records
async function fetchUnarchivedRecords() {
  const base = useBase();
  const table = base.getTable(archiveMasterTable);
  const records = await table.selectRecordsAsync();
  
  return records.records.filter(record => !record.getCellValue('Archived'));
}

// Function to archive records into separate bases
async function archiveRecords(records) {
  // Logic to group records by date and archive into different bases
}

// Function to create new archive base if not exist
async function createArchiveBase(baseName) {
  // Logic to dynamically create a new base
}

// Function to update the master table with archived status
async function updateArchivedStatus(records) {
  // Logic to update records in master table
}

// Main execution
initializeBlock(() => {
  const unarchivedRecords = fetchUnarchivedRecords();
  archiveRecords(unarchivedRecords);
});
```

### Key Features

- **Dynamic Base Creation**: New Airtable bases are created when archiving records, categorized by time period (e.g., monthly or quarterly).
- **Master Table Update**: After records are archived, the master table is updated to mark them as archived, ensuring that future runs won't re-archive the same records.

---

## Multi-Base Data Explorer Extension

### Purpose

The **Multi-Base Data Explorer** is an Airtable block extension that allows users to explore and analyze data from multiple archived bases simultaneously. It features advanced filtering options, real-time data merging, and interactive charts to help users visualize trends across their archived data.

## Multi-Base Data Explorer Extension

### Purpose

The **Multi-Base Data Explorer** is an Airtable block extension that allows users to explore and analyze data from multiple archived bases. Users can filter, search, and visualize trends in their archived data through a unified interface.

### Folder Structure

The code for the Data Explorer is organized in the following structure:

```bash
/src
  /components
    ChartComponent.js      # The chart component logic
    DataTable.js           # The table for displaying records
    Filters.js             # Components handling filters and UI controls
    Pagination.js          # The pagination controls
  /hooks
    useIndexedDB.js        # IndexedDB logic (openDB, addDataToDB, getDataFromDB, clearDataFromDB)
  /utils
    api.js                 # Functions to fetch records from the Airtable API
    constants.js           # Store constants like MAX_RECORDS_PER_BASE, CACHE_TIMEOUT_MS
    helpers.js             # Helper functions like truncateText, toggleFilter
index.js                   # Main logic for Data Explorer
```

### Detailed Breakdown

- **Data Merging**: The extension pulls data from multiple archived bases using Airtable API calls. It merges the data and stores it in the browser's IndexedDB for quick access.
- **IndexedDB Caching**: The script caches the retrieved data in IndexedDB, reducing API calls and improving performance. The cache is refreshed after a specified timeout.
- **Filtering and Pagination**: Users can filter records based on multiple fields, such as Year, Publication, Status, and Date. Pagination controls allow easy navigation through large datasets.
- **Charts**: The extension provides visual data analysis by generating charts that display records grouped by the user's chosen parameters (e.g., group by Year and stack by Status).

### Key Features

- **Data Merging from Multiple Bases**: The script fetches records from various archived bases and merges them into a single, unified dataset.
- **IndexedDB Caching**: Records are cached using IndexedDB to enhance performance and reduce API calls. The cache auto-refreshes after a specified period (1 hour by default).
- **Interactive Charts**: Users can explore data visually through charts, with options to group and filter by different fields like year, status, and publication.

---

## Configuration

- **Auto Archive Script Configuration**:
  - Modify the `apiKey`, `workspaceId`, and `frequency` to fit your Airtable setup.
  - Adjust `MAX_RECORDS_PER_BASE` and `CACHE_TIMEOUT_MS` as necessary to match your record limits and caching preferences.

- **Multi-Base Data Explorer Configuration**:
  - Ensure that your Airtable API key and base IDs are correctly configured in the environment or directly within the script.
  - Customize filtering and visualization parameters within the Data Explorer as needed.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
