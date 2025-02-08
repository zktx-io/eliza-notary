import path from 'path';

import { SqliteDatabaseAdapter } from '@elizaos/adapter-sqlite';
import {
  CacheManager,
  Character,
  DbCacheAdapter,
  IDatabaseCacheAdapter,
} from '@elizaos/core';
import Database from 'better-sqlite3';

export function initializeDatabase(dataDir: string): SqliteDatabaseAdapter {
  try {
    const filePath = path.resolve(dataDir, 'db.sqlite');
    const db = new SqliteDatabaseAdapter(new Database(filePath));
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export function initializeDbCache(
  character: Character,
  db: IDatabaseCacheAdapter,
): CacheManager {
  try {
    const cache = new CacheManager(new DbCacheAdapter(db, character.id!));
    return cache;
  } catch (error) {
    console.error('Error initializing database cache:', error);
    throw error;
  }
}
