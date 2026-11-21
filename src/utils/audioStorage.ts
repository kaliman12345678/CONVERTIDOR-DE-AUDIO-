export interface SavedAudio {
  id: string;
  name: string;
  date: number; // timestamp
  duration: number;
  format: 'ogg' | 'mp3' | 'wav';
  size: number;
  blob: Blob;
}

const DB_NAME = 'AudioCRM_DB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_audios';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioToHistory(
  audioData: Omit<SavedAudio, 'id'>
): Promise<SavedAudio> {
  const db = await openDB();
  const id = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: SavedAudio = { ...audioData, id };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioHistory(): Promise<SavedAudio[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const results = (req.result as SavedAudio[]) || [];
      // Sort newest first
      results.sort((a, b) => b.date - a.date);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioFromHistory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
