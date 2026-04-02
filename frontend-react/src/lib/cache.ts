import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'sos_location_cache';
const DB_VERSION = 2;

interface GisCacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('gis_data')) {
          db.createObjectStore('gis_data', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export const gisCache = {
  async get(key: string, ttlMs: number = 1000 * 60 * 60 * 24) {
    try {
      const db = await getDB();
      const entry = (await db.get('gis_data', key)) as GisCacheEntry | undefined;
      
      if (!entry) return null;
      
      const isExpired = Date.now() - entry.timestamp > ttlMs;
      if (isExpired) {
        await db.delete('gis_data', key);
        return null;
      }
      
      return entry.data;
    } catch (e) {
      console.error('GIS Cache read error:', e);
      return null;
    }
  },

  async set(key: string, data: unknown) {
    try {
      const db = await getDB();
      await db.put('gis_data', {
        key,
        data,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('GIS Cache write error:', e);
    }
  },

  async clear() {
    const db = await getDB();
    await db.clear('gis_data');
  }
};
