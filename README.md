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
    git clone https://github.com/Bullkn0x/MultiBaseMerge.git
    cd MultiBaseMerge
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

1. **Configuration Setup**: 
   - The user is prompted to provide key information, including the master table (to archive from), Airtable API key, archive frequency (e.g., monthly, quarterly), and the workspace ID where the archive bases will be created.
   
2. **Base Schema Extraction**: 
   - The script dynamically extracts the schema of the master table, excluding unnecessary fields like the "Archived" checkbox field. This schema is used when creating new bases to store archived records.

3. **Archive Base Tracking**: 
   - The script checks if a tracking table exists to keep track of previously created archive bases. If it doesn't, a new tracking table is created, which stores metadata such as archive base IDs and names.

4. **Logging Table Setup**: 
   - A log table is created (if not already present) to record information about each archival run, including total records processed, errors encountered, and execution time.

5. **Record Filtering and Archival**: 
   - The script filters unarchived records from the master table and assigns them to different archive bases based on the selected frequency (monthly, quarterly, etc.). It dynamically creates new archive bases as needed and transfers records in batches to optimize performance.

6. **Archiving Process Logging**: 
   - At the end of the run, the script logs the details of the archival process, including any errors, the number of records processed, and time taken, into the logging table.

### Multi-Base Data Explorer Detailed Walkthrough

The **Multi-Base Data Explorer** is an extension built using Airtable's block SDK. It provides an intuitive interface for users to explore and analyze records from multiple archived Airtable bases. Here's how the extension works:

1. **Fetching Data from Multiple Bases**: 
   - The explorer collects records from various archived bases by utilizing Airtable's API. It queries each base, retrieves the data, and combines the records into a single dataset for easy analysis.

2. **Caching Data in IndexedDB**: 
   - To improve performance and reduce repeated API calls, the fetched data is cached locally in the browser using IndexedDB. The cache expires based on a specified time interval (default: 1 hour), after which the extension re-fetches fresh data from the Airtable API.

3. **Advanced Filtering**: 
   - The extension allows users to apply multiple filters, such as by year, publication, status, and date range. This helps in refining the dataset to display only the most relevant records.

4. **Interactive Data Visualization**: 
   - The extension includes an interactive chart component that lets users visualize data based on their filters. Users can group data by fields (e.g., year, publication) and stack by additional fields to get a deeper understanding of the dataset.

5. **Pagination and Table View**: 
   - The explorer displays records in a paginated table, with each page showing a set number of records. Users can easily navigate through pages and sort data by various fields.

6. **Refreshing Data**: 
   - The data is automatically refreshed if the cache expires or manually refreshed by the user via the UI.

## Configuration

- **Auto Archive Script Configuration**:
  - Modify the `apiKey`, `workspaceId`, and `frequency` to fit your Airtable setup.
  - Adjust `MAX_RECORDS_PER_BASE` and `CACHE_TIMEOUT_MS` as necessary to match your record limits and caching preferences.

- **Multi-Base Data Explorer Configuration**:
  - Ensure that your Airtable API key and base IDs are correctly configured in the environment or directly within the script.
  - Customize filtering and visualization parameters within the Data Explorer as needed.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
