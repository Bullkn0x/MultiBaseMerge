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

## Configuration

- **Auto Archive Script Configuration**:
  - Modify the `apiKey`, `workspaceId`, and `frequency` to fit your Airtable setup.
  - Adjust `MAX_RECORDS_PER_BASE` and `CACHE_TIMEOUT_MS` as necessary to match your record limits and caching preferences.

- **Multi-Base Data Explorer Configuration**:
  - Ensure that your Airtable API key and base IDs are correctly configured in the environment or directly within the script.
  - Customize filtering and visualization parameters within the Data Explorer as needed.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
