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

### Detailed Breakdown

The **Multi-Base Data Explorer** is a front-end interface built using Airtable Blocks SDK and React. It fetches records from multiple archive bases, merges them, and stores them in the browser’s IndexedDB for faster loading and reduced API calls.

```javascript
import {
    initializeBlock,
    useBase,
    useRecords,
    Box,
    Heading,
    Text,
    Input,
    Button,
    Loader,
    Select,
    Link,
} from '@airtable/blocks/ui';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const CACHE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// IndexedDB Utilities
const openDB = () => {
    const request = indexedDB.open('AirtableCacheDB', 1);
    request.onupgradeneeded = function (event) {
        const db = event.target.result;
        db.createObjectStore('records', { keyPath: 'id' });
    };
};

// Data Explorer Main Function
function DataExplorer() {
    const base = useBase();
    const records = useRecords(base.getTable('Archive Base Tracking'));
    
    const fetchRecordsFromArchive = useCallback(async (baseId, tableId) => {
        // Fetch data using Airtable API
    }, []);
    
    const loadAllRecords = useCallback(async (forceReload = false) => {
        const cachedData = await getDataFromDB();
        // Check if cache exists and is within timeout
        // Fetch and merge data from multiple archive bases
    }, []);
    
    return (
        <Box>
            <Heading>Multi-Base Data Explorer</Heading>
            <Loader isLoading={isDataLoading} />
            {/* Data filters and table display */}
        </Box>
    );
}

initializeBlock(() => <DataExplorer />);
```

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

## Features

### **Data Aggregation**: 
Fetch and merge data from multiple Airtable bases and tables that share the same schema.

### **Filtering**: 
Apply various filters based on fields such as Year, Publication, and Status.

### **Pagination**: 
Navigate through large datasets with paginated views.

### **Charts**: 
Interactive charts to visualize data grouped and counted by fields like Year or Date.

### **IndexedDB Caching**: 
Cache Airtable data using IndexedDB for offline support and optimized performance.

### **Table View**: 
View records in a sortable, paginated table with links to the corresponding records in Airtable.

### **Data Sync**: 
Automatically refresh data based on a cache timeout or manual refresh triggers.

---

## Folder Structure

```
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
index.js                   # The main entry point, includes the DataExplorer logic
```

## Installation

1. Clone the repository.
2. Install dependencies using:

   ```
   npm install
   ```

3. Run the extension:

   ```
   block run 
   ```

4. Deploy the Airtable block to use it with your Airtable base.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
