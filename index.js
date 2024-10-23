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
import ChartComponent from './components/ChartComponent';
import DataTable from './components/DataTable';
import Filters from './components/Filters';
import Pagination from './components/Pagination';
import { openDB, addDataToDB, getDataFromDB, clearDataFromDB } from './hooks/useIndexedDB';
import { fetchRecordsFromBase } from './utils/api';
import { MAX_RECORDS_PER_BASE, CACHE_TIMEOUT_MS, ITEMS_PER_PAGE } from './utils/constants';
import { toggleFilter, truncateText } from './utils/helpers';

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
            tables: [record.getCellValue('Primary Table ID')],
        }));
    }, [archiveRecords]);

    const loadAllRecords = useCallback(async (forceReload = false) => {
        if (hasDataFetched && !forceReload) return;

        setIsDataLoading(true);
        setLoadProgress(0);

        if (!forceReload) {
            try {
                const cachedData = await getDataFromDB();
                if (cachedData.length > 0) {
                    const latestTimestamp = cachedData[0].timestamp;
                    const currentTimestamp = Date.now();

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

        await clearDataFromDB();
        await addDataToDB(combinedRecords);
        setHasDataFetched(true);
    }, [archives, hasDataFetched]);

    useEffect(() => {
        if (!isInitialMount.current) {
            isInitialMount.current = true;
            loadAllRecords();
        }
    }, [loadAllRecords]);

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

    return (
        <Box border="thick" margin={2} padding={3}>
            <Filters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                yearSelection={yearSelection}
                setYearSelection={setYearSelection}
                publicationSelection={publicationSelection}
                setPublicationSelection={setPublicationSelection}
                statusSelection={statusSelection}
                setStatusSelection={setStatusSelection}
                startDateFilter={startDateFilter}
                setStartDateFilter={setStartDateFilter}
                endDateFilter={endDateFilter}
                setEndDateFilter={setEndDateFilter}
                clearAllFilters={clearAllFilters}
                yearOptions={yearOptions}
                publicationOptions={publicationOptions}
                statusOptions={statusOptions}
            />
            <Box display="flex" marginBottom={2}>
                <Button onClick={() => loadAllRecords(true)} marginRight={2}>
                    Refresh Data
                </Button>
               
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
                            bucketBy={bucketBy}
                        />
                    </Box>
                    <Text marginBottom={2}>{filteredData.length} records found (Total records: {dataItems.length})</Text>
                    <DataTable
                        tableData={paginatedData}
                        headers={groupableFields}
                    />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        setCurrentPage={setCurrentPage}
                    />
                </Box>
            )}
        </Box>
    );
}

initializeBlock(() => <DataExplorer />);
