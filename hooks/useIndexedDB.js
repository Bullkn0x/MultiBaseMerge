export const openDB = () => {
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

export const addDataToDB = async (data) => {
    const db = await openDB();
    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    const timestamp = Date.now();

    data.forEach(record => {
        store.put({ ...record, timestamp });
    });
    return transaction.complete;
};

export const getDataFromDB = async () => {
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

export const clearDataFromDB = async () => {
    const db = await openDB();
    const transaction = db.transaction(['records'], 'readwrite');
    const store = transaction.objectStore('records');
    store.clear();
    return transaction.complete;
};
