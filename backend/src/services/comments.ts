import type { DB } from '../db/client';
import { comments } from '../db/schema';
import { HttpError } from '../domain/errors';
import type { TaskStatus } from '../db/schema';

export async function addComment(db: DB, taskId: number, body: string, status: TaskStatus) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Comment body is required');
  }
  const row = db
    .insert(comments)
    .values({ taskId, body: trimmed, status, createdAt: new Date() })
    .returning()
    .get();
  return row;
}
