import { openDB, type IDBPDatabase } from 'idb';
import { frontendLogger } from './logger';
import { apiClient } from '../services/apiClient';

export interface OutboxCommand {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data: any;
  priority: number;
  timestamp: number;
  retries: number;
}

const DB_NAME = 'mg-location-v1.1';
const STORE_NAME = 'outbox';

class SyncEngine {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, 1, {
      upgrade(db: IDBPDatabase) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }

  async queue(command: Omit<OutboxCommand, 'id' | 'timestamp' | 'retries'>) {
    const fullCommand: OutboxCommand = {
      ...command,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    const db = await this.db;
    await db.put(STORE_NAME, fullCommand);
    frontendLogger.info('Command queued in outbox', { id: fullCommand.id, url: fullCommand.url });

    // Trigger sync attempt
    this.processOutbox();
    return fullCommand.id;
  }

  async getOutbox(): Promise<OutboxCommand[]> {
    const db = await this.db;
    return await db.getAll(STORE_NAME);
  }

  async processOutbox() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      frontendLogger.debug('SyncEngine: skipping process, navigator.onLine is false');
      return;
    }

    const db = await this.db;
    const commands = await db.getAll(STORE_NAME);
    
    // Sort by priority and timestamp
    commands.sort((a: OutboxCommand, b: OutboxCommand) => b.priority - a.priority || a.timestamp - b.timestamp);

    for (const cmd of commands) {
      try {
        await apiClient.request({
          method: cmd.method,
          url: cmd.url,
          data: cmd.data,
          headers: {
            'X-Command-Id': cmd.id,
            'Accept': 'application/x-msgpack',
            'Content-Type': 'application/x-msgpack'
          }
        });

        await db.delete(STORE_NAME, cmd.id);
        frontendLogger.info('Command successfully synced', { id: cmd.id });
      } catch (err) {
        frontendLogger.warn('Failed to sync command', { id: cmd.id, error: err });
        cmd.retries++;
        if (cmd.retries > 10) {
          // Give up or move to a "failed" store?
          frontendLogger.error('Command exceeded max retries, dropping', { id: cmd.id });
          await db.delete(STORE_NAME, cmd.id);
        } else {
          await db.put(STORE_NAME, cmd.id);
          // Wait before next attempt?
          break; 
        }
      }
    }
  }
}

export const syncEngine = new SyncEngine();
