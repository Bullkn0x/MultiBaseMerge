import React from 'react';
import { Box, Button, Text } from '@airtable/blocks/ui';

export default function Pagination({ currentPage, totalPages, setCurrentPage }) {
    return (
        <Box display="flex" justifyContent="center" marginTop={2}>
            <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} marginRight={2}>Previous</Button>
            <Text marginRight={2}>Page {currentPage} of {totalPages}</Text>
            <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
        </Box>
    );
}
