// IndexedDB utility for storing PDF files locally

const DB_NAME = 'pdf-viewer-storage';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

interface StoredPdf {
    id: string;
    name: string;
    data: ArrayBuffer;
    size: number;
    createdAt: string;
}

export interface StorageStats {
    files: Array<{ id: string; name: string; size: number }>;
    totalSize: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });

    return dbPromise;
}

export async function savePdf(id: string, data: ArrayBuffer, name: string): Promise<void> {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const record: StoredPdf = {
            id,
            name,
            data,
            size: data.byteLength,
            createdAt: new Date().toISOString(),
        };

        const request = store.put(record);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getPdf(id: string): Promise<{ blob: Blob; name: string } | null> {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const record = request.result as StoredPdf | undefined;
            if (record) {
                const blob = new Blob([record.data], { type: 'application/pdf' });
                resolve({ blob, name: record.name });
            } else {
                resolve(null);
            }
        };
    });
}

export async function deletePdf(id: string): Promise<void> {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export async function getStorageStats(): Promise<StorageStats> {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const records = request.result as StoredPdf[];
            const files = records.map(r => ({
                id: r.id,
                name: r.name,
                size: r.size,
            }));
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);
            resolve({ files, totalSize });
        };
    });
}

export async function clearAllPdfs(): Promise<void> {
    const db = await getDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
