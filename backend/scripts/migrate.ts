import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from '../src/db/client';

const { db, sqlite } = createDb();

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');
migrate(db, { migrationsFolder });

sqlite.close();
console.log(`[migrate] applied pending migrations from ${migrationsFolder}`);
