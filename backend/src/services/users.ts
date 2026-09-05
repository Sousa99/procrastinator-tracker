import { eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { users } from '../db/schema';
import { HttpError, conflict, notFound } from '../domain/errors';

/**
 * Lists all users in the database, ordered by name.
 * @param db The database instance.
 * @returns An array of user objects.
 */
export function listUsers(db: DB) {
  return db.select().from(users).orderBy(users.name).all();
}

/**
 * Creates a new user in the database.
 * @param db The database instance.
 * @param name The name of the user to create.
 * @returns The created user object.
 * @throws HttpError if the user name is empty or already exists.
 */
export async function createUser(db: DB, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'User name is required');
  }

  const existing = db.select().from(users).where(eq(users.name, trimmed)).get();
  if (existing) {
    throw conflict(`User '${trimmed}' already exists`);
  }

  const row = db.insert(users).values({ name: trimmed }).returning().get();
  return row;
}

/**
 * Deletes a user from the database.
 * @param db The database instance.
 * @param id The ID of the user to delete.
 * @throws HttpError if the user does not exist.
 */
export function deleteUser(db: DB, id: number) {
  const result = db.delete(users).where(eq(users.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`User ${id} not found`);
  }
}
