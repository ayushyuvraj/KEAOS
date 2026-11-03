/**
 * Browser IndexedDB File Storage Service
 * 
 * Provides robust binary persistence for uploaded PDF/image/dataset files
 * so they survive page reloads and tab navigations without memory loss.
 */

const DB_NAME = 'KEAOS_FILE_STORE';
const STORE_NAME = 'binary_files';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[FileStorage] Failed to open IndexedDB:', request.error);
        resolve(null);
      };
    });
  }

  return dbPromise;
}

/**
 * Save binary File/Blob to IndexedDB
 */
export async function persistBinaryFile(key, fileOrBlob) {
  if (!key || !fileOrBlob) return false;
  try {
    const db = await getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileOrBlob, key);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('[FileStorage] Error saving file:', req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('[FileStorage] Unexpected persist error:', err);
    return false;
  }
}

/**
 * Retrieve binary File/Blob from IndexedDB
 */
export async function getPersistedBinaryFile(key) {
  if (!key) return null;
  try {
    const db = await getDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => {
        console.warn('[FileStorage] Error reading file:', req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('[FileStorage] Unexpected retrieval error:', err);
    return null;
  }
}

/**
 * Delete binary file by key
 */
export async function deletePersistedBinaryFile(key) {
  if (!key) return;
  try {
    const db = await getDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch (err) {
    console.warn('[FileStorage] Error deleting file:', err);
  }
}

