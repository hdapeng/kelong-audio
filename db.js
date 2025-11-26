// db.js - IndexedDB Storage Layer for Kelong Audio

const DB_NAME = 'KelongAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

let db = null;

/**
 * Initialize the database
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Database error: " + event.target.errorCode);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database initialized successfully");
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // KeyPath is 'id' (unique task ID)
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                // Create index on created_at for sorting and cleanup
                objectStore.createIndex('created_at', 'created_at', { unique: false });
                console.log("Object store created");
            }
        };
    });
}

/**
 * Save a task (insert or update)
 * @param {Object} task
 * @returns {Promise<void>}
 */
function saveTask(task) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized");
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(task);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Get all tasks sorted by created_at desc
 * @returns {Promise<Array>}
 */
function getTasks() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized");

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('created_at');
        const request = index.openCursor(null, 'prev'); // 'prev' for descending order
        const tasks = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                tasks.push(cursor.value);
                cursor.continue();
            } else {
                resolve(tasks);
            }
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Delete a task by ID
 * @param {string} id
 * @returns {Promise<void>}
 */
function deleteTask(id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized");

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Clear tasks older than 48 hours
 * @returns {Promise<number>} number of deleted tasks
 */
function clearExpiredTasks() {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Database not initialized");

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('created_at');
        const now = Date.now();
        const expirationTime = 48 * 60 * 60 * 1000; // 48 hours in ms
        const threshold = now - expirationTime;
        
        // Range: anything strictly less than threshold
        const range = IDBKeyRange.upperBound(threshold);
        const request = index.openCursor(range);
        
        let deletedCount = 0;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                deletedCount++;
                cursor.continue();
            } else {
                if (deletedCount > 0) {
                    console.log(`Cleaned up ${deletedCount} expired tasks`);
                }
                resolve(deletedCount);
            }
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

// Export functions to global scope
window.dbLayer = {
    initDB,
    saveTask,
    getTasks,
    deleteTask,
    clearExpiredTasks
};
