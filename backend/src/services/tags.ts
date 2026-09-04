import { sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { tags } from '../db/schema';
import { HttpError, conflict } from '../domain/errors';

export function listTags(db: DB) {
  return db.select().from(tags).orderBy(tags.name).all();
}

export async function createTag(db: DB, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Tag name is required');
  }
  const existing = db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${trimmed.toLowerCase()}`)
    .get();
  if (existing) {
    throw conflict(`Tag '${trimmed}' already exists`);
  }
  const row = db.insert(tags).values({ name: trimmed }).returning().get();
  return row;
}
