// 存档（IndexedDB）- 浏览器层
import type { GameState } from '../logic/state/types';
import { serialize, deserialize, type SaveData } from '../logic/state/serialize';

const DB_NAME = 'civ-saves';
const STORE = 'saves';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGame(state: GameState): Promise<void> {
  const db = await openDB();
  const data: SaveData = serialize(state);
  data.createdAt = new Date().toISOString();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, 'current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadGame(): Promise<GameState | null> {
  const db = await openDB();
  const data = await new Promise<SaveData | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('current');
    req.onsuccess = () => resolve(req.result as SaveData | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!data) return null;
  return deserialize(data);
}
