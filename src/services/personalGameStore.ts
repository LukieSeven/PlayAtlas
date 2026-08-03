import {
  PersonalGameRecord,
  PlayStatus,
  InterestStatus,
  GameOwnership,
  CompletionRecord,
  PlaySessionRecord,
} from '../types/personal';
import { personalDataRepository } from './personalDataRepository';

type Listener = () => void;

/**
 * Normalizes any variation of game ID (e.g. 12345, "12345", "igdb_12345", "igdb:12345")
 * into a single canonical store key format ("igdb_12345").
 */
export function normalizePersonalGameId(gameId: string | number | unknown): string {
  if (typeof gameId === 'number') {
    return `igdb_${gameId}`;
  }
  if (!gameId || typeof gameId !== 'string') {
    return 'igdb_0';
  }
  const str = gameId.trim();
  if (/^\d+$/.test(str)) {
    return `igdb_${str}`;
  }
  if (str.startsWith('igdb:')) {
    return `igdb_${str.slice(5)}`;
  }
  if (!str.startsWith('igdb_')) {
    return `igdb_${str}`;
  }
  return str;
}

class PersonalGameStore {
  private cache: Map<string, PersonalGameRecord> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  
  // Per-game listener sets & global listeners
  private gameListenersMap: Map<string, Set<Listener>> = new Map();
  private globalListeners: Set<Listener> = new Set();

  // Async write queues per canonical game ID
  private writeQueuesMap: Map<string, Promise<void>> = new Map();

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const records = await personalDataRepository.getAll();
      for (const rec of records) {
        const canonicalId = normalizePersonalGameId(rec.gameId);
        this.cache.set(canonicalId, {
          ...rec,
          gameId: canonicalId,
          ownerships: Array.isArray(rec.ownerships) ? [...rec.ownerships] : [],
          customTags: Array.isArray(rec.customTags) ? [...rec.customTags] : [],
          playSessions: Array.isArray(rec.playSessions) ? [...rec.playSessions] : [],
          completionHistory: Array.isArray(rec.completionHistory) ? [...rec.completionHistory] : [],
        });
      }
      this.isInitialized = true;
      this.notifyGlobal();
    })();

    return this.initPromise;
  }

  /**
   * Subscribes to changes for a specific game ID.
   * Ensures only component instances rendering that game update when its record mutates.
   */
  public subscribeToGame(gameId: string | number, listener: Listener): () => void {
    const canonicalId = normalizePersonalGameId(gameId);
    if (!this.gameListenersMap.has(canonicalId)) {
      this.gameListenersMap.set(canonicalId, new Set());
    }
    const set = this.gameListenersMap.get(canonicalId)!;
    set.add(listener);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.gameListenersMap.delete(canonicalId);
      }
    };
  }

  /**
   * Subscribes to global store changes (for My Games / catalog aggregation pages).
   */
  public subscribe(listener: Listener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  private notifyGame(gameId: string | number): void {
    const canonicalId = normalizePersonalGameId(gameId);
    const targetSet = this.gameListenersMap.get(canonicalId);
    if (targetSet) {
      targetSet.forEach(l => {
        try {
          l();
        } catch (err) {
          console.error(`Error in game listener for ${canonicalId}:`, err);
        }
      });
    }
    this.notifyGlobal();
  }

  private notifyGlobal(): void {
    this.globalListeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('Error in global PersonalGameStore listener:', err);
      }
    });
  }

  private parseNumericId(gameId: string): number {
    const cleaned = gameId.replace(/^igdb_/, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  private createDefaultRecord(gameId: string | number, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): PersonalGameRecord {
    const canonicalId = normalizePersonalGameId(gameId);
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      gameId: canonicalId,
      numericId: this.parseNumericId(canonicalId),
      ownerships: [],
      customTags: [],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: false,
      catalogSnapshot,
    };
  }

  public isRecordEmpty(record: PersonalGameRecord): boolean {
    return (
      !record.interestStatus &&
      !record.currentPlayStatus &&
      !record.inBacklogQueue &&
      (record.userRating === undefined || record.userRating === null) &&
      (!record.userNotes || !record.userNotes.trim()) &&
      (!record.ownerships || record.ownerships.length === 0) &&
      (!record.customTags || record.customTags.length === 0) &&
      (!record.playSessions || record.playSessions.length === 0) &&
      (!record.completionHistory || record.completionHistory.length === 0)
    );
  }

  public getRecord(gameId: string | number | undefined | null): PersonalGameRecord | undefined {
    if (gameId === undefined || gameId === null) return undefined;
    const canonicalId = normalizePersonalGameId(gameId);
    return this.cache.get(canonicalId);
  }

  public getAllRecords(): PersonalGameRecord[] {
    return Array.from(this.cache.values());
  }

  /**
   * Enqueues an async IndexedDB write per canonical game ID to guarantee write-order safety.
   */
  private enqueueWrite(gameId: string | number, writeFn: () => Promise<void>): Promise<void> {
    const canonicalId = normalizePersonalGameId(gameId);
    const currentQueue = this.writeQueuesMap.get(canonicalId) || Promise.resolve();

    const nextQueue = currentQueue
      .then(async () => {
        await writeFn();
      })
      .catch(err => {
        console.error(`IndexedDB write error for ${canonicalId}:`, err);
      });

    this.writeQueuesMap.set(canonicalId, nextQueue);
    return nextQueue;
  }

  /**
   * Optimistically updates store in memory, notifies local subscribers instantly, and queues IndexedDB persistence.
   */
  private commitRecordUpdate(record: PersonalGameRecord): void {
    const canonicalId = normalizePersonalGameId(record.gameId);
    const now = new Date().toISOString();

    if (this.isRecordEmpty(record)) {
      this.cache.delete(canonicalId);
      this.notifyGame(canonicalId);
      this.enqueueWrite(canonicalId, () => personalDataRepository.delete(canonicalId));
    } else {
      const immutableRecord: PersonalGameRecord = {
        ...record,
        gameId: canonicalId,
        updatedAt: now,
        ownerships: [...record.ownerships],
        customTags: [...record.customTags],
        playSessions: [...record.playSessions],
        completionHistory: [...record.completionHistory],
      };

      this.cache.set(canonicalId, immutableRecord);
      this.notifyGame(canonicalId);
      this.enqueueWrite(canonicalId, () => personalDataRepository.put(immutableRecord));
    }
  }

  public async setInterestStatus(gameId: string | number, status?: InterestStatus, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      interestStatus: status,
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async setPlayStatus(gameId: string | number, status?: PlayStatus, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      currentPlayStatus: status,
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async addOwnership(gameId: string | number, ownership: GameOwnership, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const ownerships = [...existing.ownerships];
    const idx = ownerships.findIndex(o => o.platformId === ownership.platformId && o.ownershipType === ownership.ownershipType);
    if (idx >= 0) {
      ownerships[idx] = { ...ownerships[idx], ...ownership };
    } else {
      ownerships.push(ownership);
    }

    const updated: PersonalGameRecord = {
      ...existing,
      ownerships,
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async updateOwnership(gameId: string | number, platformId: number, values: Partial<GameOwnership>): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId);
    if (!existing) return;

    const ownerships = existing.ownerships.map(o => {
      if (o.platformId === platformId) {
        return { ...o, ...values };
      }
      return o;
    });

    const updated: PersonalGameRecord = {
      ...existing,
      ownerships,
    };

    this.commitRecordUpdate(updated);
  }

  public async removeOwnership(gameId: string | number, platformId: number, ownershipType?: string): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId);
    if (!existing) return;

    const ownerships = existing.ownerships.filter(o => {
      if (o.platformId !== platformId) return true;
      if (ownershipType && o.ownershipType !== ownershipType) return true;
      return false;
    });

    const updated: PersonalGameRecord = {
      ...existing,
      ownerships,
    };

    this.commitRecordUpdate(updated);
  }

  public async setBacklog(gameId: string | number, enabled: boolean, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      inBacklogQueue: enabled,
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async setUserRating(gameId: string | number, rating?: number, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      userRating: rating !== undefined && rating !== null ? Math.max(0, Math.min(10, rating)) : undefined,
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async setNotes(gameId: string | number, notes?: string, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      userNotes: notes,
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async addCompletion(gameId: string | number, completion: CompletionRecord, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      completionHistory: [...existing.completionHistory, completion],
      currentPlayStatus: 'completed',
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async startPlaySession(gameId: string | number, session: PlaySessionRecord, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId) || this.createDefaultRecord(canonicalId, catalogSnapshot);

    const updated: PersonalGameRecord = {
      ...existing,
      playSessions: [...existing.playSessions, session],
      currentPlayStatus: 'playing',
      catalogSnapshot: catalogSnapshot || existing.catalogSnapshot,
    };

    this.commitRecordUpdate(updated);
  }

  public async endPlaySession(gameId: string | number, sessionId: string, endDate?: string): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    const existing = this.cache.get(canonicalId);
    if (!existing) return;

    const playSessions = existing.playSessions.map(s => {
      if (s.sessionId === sessionId) {
        return { ...s, endDate: endDate || new Date().toISOString() };
      }
      return s;
    });

    const updated: PersonalGameRecord = {
      ...existing,
      playSessions,
    };

    this.commitRecordUpdate(updated);
  }

  public async removePersonalRecord(gameId: string | number): Promise<void> {
    await this.init();
    const canonicalId = normalizePersonalGameId(gameId);
    this.cache.delete(canonicalId);
    this.notifyGame(canonicalId);
    this.enqueueWrite(canonicalId, () => personalDataRepository.delete(canonicalId));
  }
}

export const personalGameStore = new PersonalGameStore();
