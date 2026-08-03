import { PersonalGameRecord } from '../types/personal';

const DB_NAME = 'PlayAtlas_PersonalDataDB';
const DB_VERSION = 1;
const STORE_GAMES = 'personal_games';

type Listener = () => void;

class PersonalDataRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<Listener> = new Set();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_GAMES)) {
          const store = db.createObjectStore(STORE_GAMES, { keyPath: 'gameId' });
          store.createIndex('numericId', 'numericId', { unique: true });
          store.createIndex('currentPlayStatus', 'currentPlayStatus', { unique: false });
          store.createIndex('inBacklogQueue', 'inBacklogQueue', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('Error in PersonalDataRepository listener:', err);
      }
    });
  }

  public async get(gameId: string): Promise<PersonalGameRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GAMES, 'readonly');
        const store = tx.objectStore(STORE_GAMES);
        const req = store.get(gameId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`Failed to get personal record for ${gameId}:`, err);
      return null;
    }
  }

  public async getAll(): Promise<PersonalGameRecord[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GAMES, 'readonly');
        const store = tx.objectStore(STORE_GAMES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('Failed to get all personal records:', err);
      return [];
    }
  }

  public async put(record: PersonalGameRecord): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_GAMES, 'readwrite');
        const store = tx.objectStore(STORE_GAMES);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      this.notify();
    } catch (err) {
      console.error(`Failed to put personal record for ${record.gameId}:`, err);
    }
  }

  public async delete(gameId: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_GAMES, 'readwrite');
        const store = tx.objectStore(STORE_GAMES);
        const req = store.delete(gameId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      this.notify();
    } catch (err) {
      console.error(`Failed to delete personal record for ${gameId}:`, err);
    }
  }

  public async bulkPut(records: PersonalGameRecord[]): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_GAMES, 'readwrite');
        const store = tx.objectStore(STORE_GAMES);
        for (const record of records) {
          store.put(record);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      this.notify();
    } catch (err) {
      console.error('Failed to bulkPut personal records:', err);
    }
  }

  public async clearStore(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_GAMES, 'readwrite');
        const store = tx.objectStore(STORE_GAMES);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      this.notify();
    } catch (err) {
      console.error('Failed to clear personal records store:', err);
    }
  }
}

export const personalDataRepository = new PersonalDataRepository();
