import React from 'react';


export const truncateText = (value) => {
    if (value.length <= 8) return value;
    return (
        <span title={value}>
            {`${value.slice(0, 4)}...${value.slice(-4)}`}
        </span>
    );
};

export const toggleFilter = (value, filterArray, setFilterArray) => {
    if (filterArray.includes(value)) {
        setFilterArray(filterArray.filter(item => item !== value));
    } else {
        setFilterArray([...filterArray, value]);
    }
};
