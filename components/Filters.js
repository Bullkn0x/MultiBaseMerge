import React from 'react';
import { Box, Input, Button, Text, Select,Heading } from '@airtable/blocks/ui';

export default function Filters({
    searchQuery,
    setSearchQuery,
    yearSelection,
    setYearSelection,
    publicationSelection,
    setPublicationSelection,
    statusSelection,
    setStatusSelection,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    clearAllFilters,
    yearOptions,
    publicationOptions,
    statusOptions,
}) {
    const toggleFilter = (value, filterArray, setFilterArray) => {
        if (filterArray.includes(value)) {
            setFilterArray(filterArray.filter(item => item !== value));
        } else {
            setFilterArray([...filterArray, value]);
        }
    };

    return (
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
                
                <Button onClick={clearAllFilters} marginRight={2}>Clear All Filters</Button>
            </Box>
        </Box>
    );
}
