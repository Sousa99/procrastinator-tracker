import { and, eq } from 'drizzle-orm';
import type { DB } from '../db/client';
import {
  recurrenceRules,
  tasks,
  type RecurrenceFrequency,
  type RecurrenceRule,
  type Task,
} from '../db/schema';
import { notFound } from '../domain/errors';

export function addInterval(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const d = new Date(date);
  if (frequency === 'daily') {
    d.setDate(d.getDate() + interval);
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + interval * 7);
  } else {
    d.setMonth(d.getMonth() + interval);
  }
  return d;
}

export function nextOccurrence(
  anchor: Date,
  frequency: RecurrenceFrequency,
  interval: number,
): Date {
  return addInterval(anchor, frequency, interval);
}

export function getRuleForTask(db: DB, taskId: number): RecurrenceRule | undefined {
  return db.select().from(recurrenceRules).where(eq(recurrenceRules.taskId, taskId)).get();
}

export function createRule(
  db: DB,
  taskId: number,
  frequency: RecurrenceFrequency,
  interval: number,
  anchorDate: Date,
): RecurrenceRule {
  return db
    .insert(recurrenceRules)
    .values({ taskId, frequency, interval, anchorDate })
    .returning()
    .get();
}

export function deleteRuleForTask(db: DB, taskId: number) {
  db.delete(recurrenceRules).where(eq(recurrenceRules.taskId, taskId)).run();
}

export function upsertRule(
  db: DB,
  taskId: number,
  frequency: RecurrenceFrequency,
  interval: number,
  anchorDate: Date,
): RecurrenceRule {
  const existing = getRuleForTask(db, taskId);
  if (existing) {
    return db
      .update(recurrenceRules)
      .set({ frequency, interval, anchorDate })
      .where(eq(recurrenceRules.id, existing.id))
      .returning()
      .get();
  }
  return createRule(db, taskId, frequency, interval, anchorDate);
}

export function getSourceTaskId(db: DB, task: Task): number | undefined {
  if (task.parentTaskId) return task.parentTaskId;
  if (getRuleForTask(db, task.id)) return task.id;
  return undefined;
}

function latestOccurrence(db: DB, sourceTaskId: number): { task: Task; due: Date } {
  const source = db.select().from(tasks).where(eq(tasks.id, sourceTaskId)).get();
  if (!source) {
    throw notFound(`Task ${sourceTaskId} not found`);
  }
  const sourceDue = source.dueDate ?? source.createdAt;
  const children = db
    .select()
    .from(tasks)
    .where(eq(tasks.parentTaskId, sourceTaskId))
    .orderBy(tasks.dueDate)
    .all();
  const lastChild = children[children.length - 1];
  const last = lastChild ?? source;
  const due = lastChild ? (lastChild.dueDate ?? sourceDue) : sourceDue;
  return { task: last, due };
}

export function generateNextInstance(db: DB, sourceTaskId: number): Task | null {
  const rule = getRuleForTask(db, sourceTaskId);
  if (!rule) return null;
  const { task: last, due } = latestOccurrence(db, sourceTaskId);
  if (last.status !== 'finished') return null;
  const nextDue = nextOccurrence(due, rule.frequency, rule.interval);
  const existing = db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, sourceTaskId), eq(tasks.dueDate, nextDue)))
    .get();
  if (existing) return existing;
  const now = new Date();
  const row = db
    .insert(tasks)
    .values({
      title: last.title,
      description: last.description,
      status: 'to-start',
      location: last.location,
      urgency: last.urgency,
      parentTaskId: sourceTaskId,
      dueDate: nextDue,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  return row;
}

export function catchUp(db: DB, sourceTaskId: number): Task | null {
  const rule = getRuleForTask(db, sourceTaskId);
  if (!rule) return null;
  const { task: last, due } = latestOccurrence(db, sourceTaskId);
  if (last.status !== 'finished') return null;
  const nextDue = nextOccurrence(due, rule.frequency, rule.interval);
  if (nextDue.getTime() > Date.now()) return null;
  return generateNextInstance(db, sourceTaskId);
}
