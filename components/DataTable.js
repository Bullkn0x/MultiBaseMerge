import React from 'react';
import { useTable, useSortBy } from 'react-table';
import { Box, Link } from '@airtable/blocks/ui';
import { truncateText } from '../utils/helpers';

export default function DataTable({ tableData }) {
    const tableColumns = React.useMemo(
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
                ),
            },
        ],
        []
    );

    const tableInstance = useTable({ columns: tableColumns, data: tableData }, useSortBy);

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = tableInstance;

    return (
        <Box padding={2} marginTop={4}>
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
