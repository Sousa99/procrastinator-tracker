import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type DB = BetterSQLite3Database<typeof schema>;

export interface DbHandle {
  db: DB;
  sqlite: Database.Database;
}

export function createDb(dbPath?: string): DbHandle {
  const url = dbPath ?? process.env.DATABASE_URL ?? './data/procrastinator.db';
  const isMemory = url === ':memory:' || url.startsWith('file::memory:');
  if (!isMemory) {
    const dir = path.dirname(url);
    if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(url);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}
