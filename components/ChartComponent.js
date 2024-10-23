import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Box, Text } from '@airtable/blocks/ui';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { format, parseISO } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ChartComponent({ records, groupBy, countBy, stackBy, bucketBy }) {
    const bucketDate = (date, bucketBy) => {
        const parsedDate = parseISO(date);
        switch (bucketBy) {
            case 'week':
                return format(parsedDate, 'yyyy-ww');
            case 'month':
                return format(parsedDate, 'yyyy-MM');
            case 'quarter':
                const quarter = Math.ceil((parsedDate.getMonth() + 1) / 3);
                return `${parsedDate.getFullYear()}-Q${quarter}`;
            case 'year':
                return format(parsedDate, 'yyyy');
            case 'day':
            default:
                return format(parsedDate, 'yyyy-MM-dd');
        }
    };

    const aggregatedData = records.reduce((acc, record) => {
        let groupKey;
        if (groupBy === 'Date') {
            const dateValue = record.fields?.[groupBy];
            if (dateValue) {
                groupKey = bucketDate(dateValue, bucketBy); 
            } else {
                groupKey = 'Unknown';
            }
        } else {
            groupKey = record.fields?.[groupBy] || 'Unknown';
        }

        const stackKey = stackBy ? record.fields?.[stackBy] || 'No Value' : 'All';

        if (!acc[groupKey]) {
            acc[groupKey] = {};
        }
        if (!acc[groupKey][stackKey]) {
            acc[groupKey][stackKey] = 0;
        }

        acc[groupKey][stackKey] += 1;
        return acc;
    }, {});

    const labels = Object.keys(aggregatedData).sort();
    const stackKeys = stackBy
        ? Array.from(new Set(records.map(record => record.fields?.[stackBy] || 'No Value')))
        : ['All'];

    const datasets = stackKeys.map((key, index) => ({
        label: key,
        data: labels.map(label => aggregatedData[label][key] || 0),
        backgroundColor: getStatusColor(index),
    }));

    const chartData = {
        labels,
        datasets,
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        scales: {
            x: {
                stacked: !!stackBy,
                title: {
                    display: true,
                    text: groupBy,
                },
            },
            y: {
                stacked: !!stackBy,
                beginAtZero: true,
                title: {
                    display: true,
                    text: `Count of ${countBy}`,
                },
            },
        },
    };

    return (
        <Box padding={3}>
            <Bar data={chartData} options={chartOptions} />
            <Text marginTop={2}>{records.length} records found</Text>
        </Box>
    );
}

function getStatusColor(index) {
    const colorPalette = [
        'rgba(75, 192, 192, 0.6)',  // Teal
        'rgba(255, 159, 64, 0.6)',  // Orange
        'rgba(153, 102, 255, 0.6)', // Purple
        'rgba(201, 203, 207, 0.6)', // Grey
        'rgba(255, 99, 132, 0.6)',  // Red
        'rgba(54, 162, 235, 0.6)',  // Blue
        'rgba(255, 206, 86, 0.6)',  // Yellow
    ];
    return colorPalette[index % colorPalette.length];
}
