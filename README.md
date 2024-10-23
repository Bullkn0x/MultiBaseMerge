# Airtable Archive Management & Data Explorer

This repository contains two interconnected tools designed to manage and explore large datasets in Airtable:

1. **Auto Archive Script**: A script that automates the archiving of records from a master table into multiple archived bases.
2. **Multi-Base Data Explorer**: An Airtable extension that allows users to explore, filter, and visualize data from multiple archived bases as a single dataset.

Together, these tools provide a powerful solution for maintaining data scalability while ensuring easy access to archived records for analysis and reporting.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Auto Archive Script](#auto-archive-script)
  - [Multi-Base Data Explorer](#multi-base-data-explorer)
- [Detailed Descriptions](#detailed-descriptions)
  - [Auto Archive Script Detailed Walkthrough](#auto-archive-script-detailed-walkthrough)
  - [Multi-Base Data Explorer Detailed Walkthrough](#multi-base-data-explorer-detailed-walkthrough)
- [Configuration](#configuration)
- [License](#license)

## Overview

As your Airtable base grows in size, it can become cumbersome to manage large datasets in a single table. Airtable's limits on record count per base can slow down performance and complicate workflows. This repository provides two tools to help overcome these challenges:

1. **Auto Archive Script**: Automatically archives old records into time-segmented bases (e.g., quarterly or yearly archives) while keeping your main table light and fast.
2. **Multi-Base Data Explorer**: Allows users to view and interact with data from multiple archived bases by merging records, providing powerful filtering and visualization tools.

## Features

### Auto Archive Script
- **Automated Record Archiving**: Automatically moves records from a master table into archived bases based on time periods (monthly, quarterly, semi-yearly, yearly).
- **Dynamic Base Creation**: Creates new Airtable bases as needed to store archived records.
- **Batch Processing**: Efficiently handles large datasets by batching records during the archival process.
- **Detailed Logging**: Records each archival process in a log table for auditing and tracking.
  
### Multi-Base Data Explorer
- **Merge Multiple Bases**: Combines records from multiple archived bases into one cohesive dataset for analysis.
- **Advanced Filtering**: Allows filtering by year, publication, status, and date range to refine the dataset.
- **Visual Data Exploration**: Provides an interactive charting tool to visualize data across archives.
- **IndexedDB Caching**: Caches data locally in the browser using IndexedDB for fast access and reduces the need for repeated Airtable API requests.

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/your-username/airtable-archive-management.git
    cd airtable-archive-management
    ```

2. Install the necessary dependencies (for the Data Explorer extension):
    ```bash
    npm install
    ```

3. Deploy the **Auto Archive Script** within your Airtable base by following the steps in the Airtable Script block.

4. Install and configure the **Multi-Base Data Explorer** as a custom Airtable block.

## Usage

### Auto Archive Script

1. Open your Airtable base and navigate to the Scripting block.
2. Paste the **Auto Archive Script** (available in `auto-archive-script.js`) into the Scripting block.
3. Customize the script with your Airtable API key, workspace ID, and preferred archive frequency (monthly, quarterly, etc.).
4. Run the script to automatically archive older records into new Airtable bases.

### Multi-Base Data Explorer

1. Run the Multi-Base Data Explorer extension by following the instructions provided in the `multi-base-data-explorer` folder.
2. The Data Explorer will pull in data from the archived bases and allow you to filter, visualize, and interact with the merged data.
3. Use IndexedDB caching to ensure faster reloads of the data, with the cache refreshing based on the specified time interval (default: 1 hour).

## Detailed Descriptions

### Auto Archive Script Detailed Walkthrough

This script is responsible for managing large datasets in Airtable by archiving older records into new, dynamically created bases. Here's a step-by-step breakdown of how the **Auto Archive Script** works:

```js
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
});```
This script is divided into key steps:

Configuration Setup: The script is set up to use a specific master table, API key, and archive frequency.
Fetching Unarchived Records: It fetches all records from the master table and filters out those that are already archived.
Archiving Logic: The script then groups records by the selected frequency (e.g., monthly) and creates new Airtable bases to store archived records if necessary.
Updating Master Table: Once records are archived, the master table is updated to mark the records as "Archived."
Multi-Base Data Explorer Detailed Walkthrough
The Multi-Base Data Explorer is an extension built using Airtable's block SDK. It provides an intuitive interface for users to explore and analyze records from multiple archived Airtable bases. Here's how the extension works:

```js

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

initializeBlock(() => <DataExplorer />);```
This extension has the following features:

Fetching Records from Multiple Bases: It retrieves records from multiple archived bases using the Airtable API.
Data Caching with IndexedDB: Records are stored in the browser’s IndexedDB to improve load times and reduce API calls.
Advanced Filtering: Users can filter the merged dataset by year, publication, status, and more.
Visualization with Charts: It provides an interactive charting component for visual data exploration.
Configuration
Auto Archive Script Configuration:

Modify the apiKey, workspaceId, and frequency to fit your Airtable setup.
Adjust MAX_RECORDS_PER_BASE and CACHE_TIMEOUT_MS as necessary to match your record limits and caching preferences.
Multi-Base Data Explorer Configuration:

Ensure that your Airtable API key and base IDs are correctly configured in the environment or directly within the script.
Customize filtering and visualization parameters within the Data Explorer as needed.
License
This project is licensed under the MIT License - see the LICENSE file for details.