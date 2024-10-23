import { MAX_RECORDS_PER_BASE } from './constants';

export const fetchRecordsFromBase = async (baseId, tableId) => {
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
};
