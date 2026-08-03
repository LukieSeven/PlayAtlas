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

class PersonalGameStore {
  private cache: Map<string, PersonalGameRecord> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const records = await personalDataRepository.getAll();
      for (const rec of records) {
        this.cache.set(rec.gameId, rec);
      }
      this.isInitialized = true;
      this.notify();
    })();

    return this.initPromise;
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
        console.error('Error in PersonalGameStore listener:', err);
      }
    });
  }

  private parseNumericId(gameId: string): number {
    const cleaned = gameId.replace(/^igdb_/, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  private createDefaultRecord(gameId: string, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): PersonalGameRecord {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      gameId,
      numericId: this.parseNumericId(gameId),
      ownerships: [],
      customTags: [],
      playSessions: [],
      completionHistory: [],
      inBacklogQueue: false,
      catalogSnapshot,
    };
  }

  public getRecord(gameId: string): PersonalGameRecord | undefined {
    return this.cache.get(gameId);
  }

  public getAllRecords(): PersonalGameRecord[] {
    return Array.from(this.cache.values());
  }

  private async saveRecord(record: PersonalGameRecord): Promise<void> {
    record.updatedAt = new Date().toISOString();
    this.cache.set(record.gameId, { ...record });
    this.notify();
    await personalDataRepository.put(record);
  }

  public async setInterestStatus(gameId: string, status?: InterestStatus, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    record.interestStatus = status;
    await this.saveRecord(record);
  }

  public async setPlayStatus(gameId: string, status?: PlayStatus, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    record.currentPlayStatus = status;
    await this.saveRecord(record);
  }

  public async addOwnership(gameId: string, ownership: GameOwnership, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    
    // Check if platformId and ownershipType already exist, update instead of duplicate
    const idx = record.ownerships.findIndex(o => o.platformId === ownership.platformId && o.ownershipType === ownership.ownershipType);
    if (idx >= 0) {
      record.ownerships[idx] = { ...record.ownerships[idx], ...ownership };
    } else {
      record.ownerships.push(ownership);
    }

    await this.saveRecord(record);
  }

  public async updateOwnership(gameId: string, platformId: number, values: Partial<GameOwnership>): Promise<void> {
    await this.init();
    const record = this.cache.get(gameId);
    if (!record) return;

    record.ownerships = record.ownerships.map(o => {
      if (o.platformId === platformId) {
        return { ...o, ...values };
      }
      return o;
    });

    await this.saveRecord(record);
  }

  public async removeOwnership(gameId: string, platformId: number, ownershipType?: string): Promise<void> {
    await this.init();
    const record = this.cache.get(gameId);
    if (!record) return;

    record.ownerships = record.ownerships.filter(o => {
      if (o.platformId !== platformId) return true;
      if (ownershipType && o.ownershipType !== ownershipType) return true;
      return false;
    });

    await this.saveRecord(record);
  }

  public async setBacklog(gameId: string, enabled: boolean, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    record.inBacklogQueue = enabled;
    await this.saveRecord(record);
  }

  public async setUserRating(gameId: string, rating?: number, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    
    if (rating !== undefined && rating !== null) {
      // Clamp between 0 and 10
      record.userRating = Math.max(0, Math.min(10, rating));
    } else {
      record.userRating = undefined;
    }

    await this.saveRecord(record);
  }

  public async setNotes(gameId: string, notes?: string, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    record.userNotes = notes;
    await this.saveRecord(record);
  }

  public async addCompletion(gameId: string, completion: CompletionRecord, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    record.completionHistory.push(completion);
    record.currentPlayStatus = 'completed';
    await this.saveRecord(record);
  }

  public async startPlaySession(gameId: string, session: PlaySessionRecord, catalogSnapshot?: { name: string; coverUrl?: string; releaseYear?: number }): Promise<void> {
    await this.init();
    let record = this.cache.get(gameId) || this.createDefaultRecord(gameId, catalogSnapshot);
    record.playSessions.push(session);
    record.currentPlayStatus = 'playing';
    await this.saveRecord(record);
  }

  public async endPlaySession(gameId: string, sessionId: string, endDate?: string): Promise<void> {
    await this.init();
    const record = this.cache.get(gameId);
    if (!record) return;

    record.playSessions = record.playSessions.map(s => {
      if (s.sessionId === sessionId) {
        return { ...s, endDate: endDate || new Date().toISOString() };
      }
      return s;
    });

    await this.saveRecord(record);
  }

  public async removePersonalRecord(gameId: string): Promise<void> {
    await this.init();
    this.cache.delete(gameId);
    this.notify();
    await personalDataRepository.delete(gameId);
  }
}

export const personalGameStore = new PersonalGameStore();
