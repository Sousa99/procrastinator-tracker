import { sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { tags } from '../db/schema';
import { HttpError, conflict } from '../domain/errors';

/**
 * Lists all tags in the database, ordered by name.
 * @param db The database instance.
 * @returns An array of tag objects.
 */
export function listTags(db: DB) {
  return db.select().from(tags).orderBy(tags.name).all();
}

/**
 * Creates a new tag in the database.
 * @param db The database instance.
 * @param name The name of the tag to create.
 * @returns The created tag object.
 * @throws HttpError if the tag name is empty or already exists.
 */
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
