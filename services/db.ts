import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MediStoreDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
    return dbPromise;
};

export const saveFile = async (id: string, file: File) => {
    const db = await initDB();
    return db.put(STORE_NAME, file, id);
};

export const getFile = async (id: string): Promise<File | undefined> => {
    const db = await initDB();
    return db.get(STORE_NAME, id);
};

export const deleteFile = async (id: string) => {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
};
