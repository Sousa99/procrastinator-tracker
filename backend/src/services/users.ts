import { eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import { users } from '../db/schema';
import { HttpError, conflict, notFound } from '../domain/errors';

export function listUsers(db: DB) {
  return db.select().from(users).orderBy(users.name).all();
}

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

export function deleteUser(db: DB, id: number) {
  const result = db.delete(users).where(eq(users.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`User ${id} not found`);
  }
}
