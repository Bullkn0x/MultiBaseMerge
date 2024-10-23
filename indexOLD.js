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
import { useTable, useSortBy } from 'react-table';
import ChartComponent from './BasicChartComponent';

const MAX_RECORDS_PER_BASE = 50000;
const ITEMS_PER_PAGE = 10;
const CACHE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// IndexedDB Utilities
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AirtableCacheDB', 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('records')) {
                const store = db.createObjectStore('records', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            reject('Error opening IndexedDB:', event.target.error);
        };
    });
};

const addDataToDB = async (data) => {
    const db = await openDB();
    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    const timestamp = Date.now();

    data.forEach(record => {
        store.put({ ...record, timestamp });
    });
    return transaction.complete;
};

const getDataFromDB = async () => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['records'], 'readonly');
        const store = transaction.objectStore('records');
        const request = store.getAll();

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = function (event) {
            reject('Error fetching from IndexedDB:', event.target.error);
        };
    });
};

const clearDataFromDB = async () => {
    const db = await openDB();
    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    store.clear();
    return transaction.complete;
};

function DataExplorer() {
    const [dataItems, setDataItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [yearSelection, setYearSelection] = useState([]);
    const [publicationSelection, setPublicationSelection] = useState([]);
    const [statusSelection, setStatusSelection] = useState([]);
    const [xAxisGrouping, setXAxisGrouping] = useState('Year');
    const [yAxisCounting, setYAxisCounting] = useState('Records');
    const [stackingField, setStackingField] = useState('');
    const [bucketBy, setBucketBy] = useState('day');
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    const base = useBase();
    const archiveTable = base.getTableByNameIfExists('Archive Base Tracking');
    const archiveRecords = useRecords(archiveTable);

    const isInitialMount = useRef(false);
    const [hasDataFetched, setHasDataFetched] = useState(false);

    const archives = useMemo(() => {
        if (!archiveRecords) return [];
        return archiveRecords.map(record => ({
            id: record.getCellValue('Archive ID'),
            tables: [record.getCellValue('Primary Table ID')]
        }));
    }, [archiveRecords]);

    const fetchRecordsFromBase = useCallback(async (baseId, tableId) => {
        let allRecords = [];
        let offset = null;
        const AIRTABLE_API_KEY = 'pat4MxE09UOvdYcZX.319bfb34bfaf8a6a62362d98d9bf32263f10589f62b3ef70ab8f2fcf43abf59a';

        do {
            const apiUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching data from ${baseId}, table ${tableId}: ${response.status}`);
            }

            const data = await response.json();
            allRecords = [...allRecords, ...data.records.map(record => ({
                ...record,
                baseId,
                tableId
            }))];

            offset = data.offset;

            if (allRecords.length >= MAX_RECORDS_PER_BASE) {
                break;
            }
        } while (offset);

        return allRecords.slice(0, MAX_RECORDS_PER_BASE);
    }, []);

    const loadAllRecords = useCallback(async (forceReload = false) => {
        if (hasDataFetched && !forceReload) return;

        setIsDataLoading(true);
        setLoadProgress(0);

        // Check if cached data exists and is within the timeout limit
        if (!forceReload) {
            try {
                const cachedData = await getDataFromDB();
                if (cachedData.length > 0) {
                    const latestTimestamp = cachedData[0].timestamp;
                    const currentTimestamp = Date.now();

                    // If the cached data is still within the cache timeout, use it
                    if (currentTimestamp - latestTimestamp < CACHE_TIMEOUT_MS) {
                        setDataItems(cachedData);
                        setIsDataLoading(false);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error loading cached data from IndexedDB:', error);
            }
        }

        // If no valid cache or forced reload, fetch new data
        let combinedRecords = [];
        const totalArchiveBases = archives.reduce((sum, archive) => sum + archive.tables.length, 0);
        let archivesProcessed = 0;

        for (const archive of archives) {
            for (const tableId of archive.tables) {
                try {
                    const baseRecords = await fetchRecordsFromBase(archive.id, tableId);
                    combinedRecords = [...combinedRecords, ...baseRecords];
                    archivesProcessed++;
                    setLoadProgress(Math.round((archivesProcessed / totalArchiveBases) * 100));
                } catch (error) {
                    console.error(error);
                }
            }
        }

        setDataItems(combinedRecords);
        setIsDataLoading(false);

        // Clear the existing cache and store new data
        await clearDataFromDB();
        await addDataToDB(combinedRecords);
        setHasDataFetched(true);
    }, [archives, hasDataFetched, fetchRecordsFromBase]);

    useEffect(() => {
        if (!isInitialMount.current) {
            isInitialMount.current = true;
            loadAllRecords();
        }
    }, [loadAllRecords]);

    const toggleFilter = (value, filterArray, setFilterArray) => {
        if (filterArray.includes(value)) {
            setFilterArray(filterArray.filter(item => item !== value));
        } else {
            setFilterArray([...filterArray, value]);
        }
    };

    const filteredData = useMemo(() => {
        return dataItems.filter(item => {
            const matchesSearch = searchQuery === '' || Object.values(item.fields || {}).some(value =>
                String(value).toLowerCase().includes(searchQuery.toLowerCase())
            );
            const matchesYear = yearSelection.length === 0 || (item.fields?.Year && yearSelection.includes(String(item.fields?.Year)));
            const matchesPublication = publicationSelection.length === 0 || publicationSelection.includes(item.fields?.Publication || '');
            const matchesStatus = statusSelection.length === 0 || (item.fields?.Status && statusSelection.includes(item.fields?.Status));
            const matchesDateRange = (!startDateFilter || new Date(item.fields?.Date) >= new Date(startDateFilter)) &&
                                     (!endDateFilter || new Date(item.fields?.Date) <= new Date(endDateFilter));
            return matchesSearch && matchesYear && matchesPublication && matchesStatus && matchesDateRange;
        });
    }, [dataItems, searchQuery, yearSelection, publicationSelection, statusSelection, startDateFilter, endDateFilter]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    const yearOptions = useMemo(() => [...new Set(dataItems.map(item => String(item.fields?.Year)).filter(Boolean))].sort(), [dataItems]);
    const publicationOptions = useMemo(() => [...new Set(dataItems.map(item => item.fields?.Publication).filter(Boolean))].sort(), [dataItems]);
    const statusOptions = useMemo(() => [...new Set(dataItems.map(item => item.fields?.Status).filter(Boolean))].sort(), [dataItems]);
    const groupableFields = ['Year', 'Publication', 'Status', 'Date'];

    const clearAllFilters = () => {
        setSearchQuery('');
        setYearSelection([]);
        setPublicationSelection([]);
        setStatusSelection([]);
        setStartDateFilter('');
        setEndDateFilter('');
        setCurrentPage(1);
    };

    const truncateText = (value) => {
        if (value.length <= 8) return value;
        return (
            <span title={value}>
                {`${value.slice(0, 4)}...${value.slice(-4)}`}
            </span>
        );
    };

    const tableColumns = useMemo(
        () => [
            {
                Header: 'Record ID',
                accessor: 'id',
                Cell: ({ value }) => truncateText(value),
            },
            {
                Header: 'Base ID',
                accessor: 'baseId',
                Cell: ({ value }) => truncateText(value),
            },
            {
                Header: 'Table ID',
                accessor: 'tableId',
                Cell: ({ value }) => truncateText(value),
            },
            {
                Header: 'Title',
                accessor: 'fields.Title',
                Cell: ({ row, value }) => (
                    <Link
                        href={`https://airtable.com/${row.original.baseId}/${row.original.tableId}/${row.original.id}`}
                        target="_blank"
                    >
                        {value}
                    </Link>
                ),
            },
            {
                Header: 'Year',
                accessor: 'fields.Year',
            },
            {
                Header: 'Author',
                accessor: 'fields.Author',
            },
            {
                Header: 'Publication',
                accessor: 'fields.Publication',
            },
            {
                Header: 'Status',
                accessor: 'fields.Status',
            },
            {
                Header: 'Date',
                accessor: 'fields.Date',
            },
            {
                Header: 'Go to Record',
                accessor: 'goToRecord',
                Cell: ({ row }) => (
                    <Link
                        href={`https://airtable.com/${row.original.baseId}/${row.original.tableId}/${row.original.id}`}
                        target="_blank"
                        icon="home"
                    >
                        Go To Record
                    </Link>
                )
            }
        ],
        []
    );

    const tableInstance = useTable({ columns: tableColumns, data: paginatedData }, useSortBy);

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = tableInstance;

    return (
        <Box border="thick" margin={2} padding={3}>
            <Box border="thick" padding={3} marginBottom={4}>
                <Heading>Data Filters</Heading>
                <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search across all records..."
                    marginBottom={2}
                />
                <Box marginBottom={2}>
                    <Text fontWeight="bold">Start Date:</Text>
                    <Input
                        type="date"
                        value={startDateFilter}
                        onChange={e => setStartDateFilter(e.target.value)}
                        marginBottom={2}
                    />
                    <Text fontWeight="bold">End Date:</Text>
                    <Input
                        type="date"
                        value={endDateFilter}
                        onChange={e => setEndDateFilter(e.target.value)}
                        marginBottom={2}
                    />
                </Box>
                <Box marginBottom={2}>
                    <Text fontWeight="bold">Year Filters:</Text>
                    {yearOptions.map(year => (
                        <Button
                            key={year}
                            variant={yearSelection.includes(year) ? 'primary' : 'default'}
                            onClick={() => toggleFilter(year, yearSelection, setYearSelection)}
                            style={{ marginRight: '5px', marginBottom: '5px' }}
                        >
                            {year}
                        </Button>
                    ))}
                </Box>
                <Box marginBottom={2}>
                    <Text fontWeight="bold">Publication Filters:</Text>
                    {publicationOptions.map(publication => (
                        <Button
                            key={publication}
                            variant={publicationSelection.includes(publication) ? 'primary' : 'default'}
                            onClick={() => toggleFilter(publication, publicationSelection, setPublicationSelection)}
                            style={{ marginRight: '5px', marginBottom: '5px' }}
                        >
                            {publication}
                        </Button>
                    ))}
                </Box>
                <Box marginBottom={2}>
                    <Text fontWeight="bold">Status Filters:</Text>
                    {statusOptions.map(status => (
                        <Button
                            key={status}
                            variant={statusSelection.includes(status) ? 'primary' : 'default'}
                            onClick={() => toggleFilter(status, statusSelection, setStatusSelection)}
                            style={{ marginRight: '5px', marginBottom: '5px' }}
                        >
                            {status}
                        </Button>
                    ))}
                </Box>

                <Box display="flex" marginBottom={2}>
                    <Button
                        onClick={() => loadAllRecords(true)}
                        marginRight={2}
                    >
                        Refresh Data
                    </Button>
                    <Button
                        onClick={clearAllFilters}
                        marginRight={2}
                    >
                        Clear All Filters
                    </Button>
                </Box>
            </Box>
            {isDataLoading ? (
                <Box>
                    <Loader />
                    <Text>Loading... {loadProgress}% complete</Text>
                </Box>
            ) : (
                <Box>
                    <Box padding={2} border="thick">
                        <Heading>Interactive Chart</Heading>
                        <Box width="20%">
                            <Box margin={2}>
                                <Text fontWeight="bold">Group By:</Text>
                                <Select
                                    options={groupableFields.map(field => ({ value: field, label: field }))}
                                    value={xAxisGrouping}
                                    onChange={newValue => setXAxisGrouping(newValue)}
                                    width="100%"
                                />
                            </Box>
                            <Box margin={2}>
                                <Text fontWeight="bold">Stack By:</Text>
                                <Select
                                    options={[{ value: '', label: 'None' }, ...groupableFields.map(field => ({ value: field, label: field }))]}
                                    value={stackingField}
                                    onChange={newValue => setStackingField(newValue)}
                                    width="100%"
                                />
                            </Box>
                            {(xAxisGrouping === 'Date') && (
                                <Box margin={2}>
                                    <Text fontWeight="bold">Bucket By:</Text>
                                    <Select
                                        options={[
                                            { value: 'day', label: 'Day' },
                                            { value: 'week', label: 'Week' },
                                            { value: 'month', label: 'Month' },
                                            { value: 'quarter', label: 'Quarter' },
                                            { value: 'year', label: 'Year' }
                                        ]}
                                        value={bucketBy}
                                        onChange={newValue => setBucketBy(newValue)}
                                        width="100%"
                                    />
                                </Box>
                            )}
                        </Box>
                        <ChartComponent
                            records={filteredData}
                            groupBy={xAxisGrouping}
                            countBy={yAxisCounting}
                            stackBy={stackingField}
                            bucketBy={bucketBy} // Pass bucketBy to ChartComponent
                        />
                    </Box>
                    <Text marginBottom={2}>{filteredData.length} records found (Total records: {dataItems.length})</Text>
                    
                    <Box padding={2} marginTop={4}>
                        <Heading>Records Table</Heading>
                        <table {...getTableProps()} style={styles.table}>
                            <thead>
                                {headerGroups.map(headerGroup => (
                                    <tr {...headerGroup.getHeaderGroupProps()}>
                                        {headerGroup.headers.map(column => (
                                            <th
                                                {...column.getHeaderProps(column.getSortByToggleProps())}
                                                style={styles.th}
                                            >
                                                {column.render('Header')}
                                                <span>
                                                    {column.isSorted
                                                        ? column.isSortedDesc
                                                            ? ' 🔽'
                                                            : ' 🔼'
                                                        : ''}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody {...getTableBodyProps()}>
                                {rows.map((row, i) => {
                                    prepareRow(row);
                                    return (
                                        <tr {...row.getRowProps()} style={i % 2 === 0 ? styles.stripedRow : {}}>
                                            {row.cells.map(cell => (
                                                <td
                                                    {...cell.getCellProps()}
                                                    style={styles.td}
                                                >
                                                    {cell.render('Cell')}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Box>

                    <Box display="flex" justifyContent="center" marginTop={2}>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            marginRight={2}
                        >
                            Previous
                        </Button>
                        <Text marginRight={2}>Page {currentPage} of {totalPages}</Text>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );
}

const styles = {
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        borderBottom: 'solid 2px black',
        padding: '10px',
        textAlign: 'left',
        cursor: 'pointer',
    },
    td: {
        padding: '10px',
        borderBottom: 'solid 1px gray',
    },
    stripedRow: {
        backgroundColor: '#f2f2f2',
    },
};

initializeBlock(() => <DataExplorer />);
