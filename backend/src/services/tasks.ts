import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import {
  recurrenceRules,
  tags,
  taskAssignees,
  taskTags,
  tasks,
  type RecurrenceFrequency,
  type Task,
} from '../db/schema';
import { HttpError, notFound } from '../domain/errors';
import { isValidTransition, isTaskStatus, type TaskStatus as Status } from '../domain/status';
import { addComment } from './comments';
import {
  catchUp,
  deleteRuleForTask,
  getRuleForTask,
  getSourceTaskId,
  generateNextInstance,
  upsertRule,
} from './recurrence';

export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  location: string | null;
  urgency: number | null;
  dueDate: string | null;
  parentTaskId: number | null;
  recurrence: { frequency: RecurrenceFrequency; interval: number } | null;
  tags: string[];
  assignees: { id: number; name: string }[];
  comments: { id: number; body: string; status: Status; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  interval?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  location?: string | null;
  urgency?: number | null;
  tags?: string[];
  assigneeIds?: number[];
  dueDate?: Date | null;
  recurrence?: RecurrenceInput | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  urgency?: number | null;
  tags?: string[];
  assigneeIds?: number[];
  dueDate?: Date | null;
  recurrence?: RecurrenceInput | null;
}

export interface TaskFilters {
  status?: Status;
  tag?: string;
  assignee?: number;
  urgency?: 'high' | 'low' | 'none';
  location?: string;
  finished?: boolean;
  recurring?: boolean;
}

interface TaskRelations {
  tags: { tag: { name: string } }[];
  assignees: { user: { id: number; name: string } }[];
  comments: { id: number; body: string; status: Status; createdAt: Date }[];
  recurrenceRule: { frequency: RecurrenceFrequency; interval: number } | null;
}

function serialize(task: Task, rel: TaskRelations): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    location: task.location,
    urgency: task.urgency,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    parentTaskId: task.parentTaskId,
    recurrence: rel.recurrenceRule
      ? { frequency: rel.recurrenceRule.frequency, interval: rel.recurrenceRule.interval }
      : null,
    tags: rel.tags.map((t) => t.tag.name).sort(),
    assignees: rel.assignees.map((a) => ({ id: a.user.id, name: a.user.name })),
    comments: rel.comments.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function resolveTagIds(db: DB, names: string[]): number[] {
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    let tag = db
      .select()
      .from(tags)
      .where(sql`lower(${tags.name}) = ${name.toLowerCase()}`)
      .get();
    if (!tag) {
      tag = db.insert(tags).values({ name }).returning().get();
    }
    ids.push(tag.id);
  }
  return ids;
}

function linkTags(db: DB, taskId: number, tagIds: number[]) {
  db.delete(taskTags).where(eq(taskTags.taskId, taskId)).run();
  for (const tagId of tagIds) {
    db.insert(taskTags).values({ taskId, tagId }).run();
  }
}

function linkAssignees(db: DB, taskId: number, userIds: number[]) {
  db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId)).run();
  for (const userId of userIds) {
    db.insert(taskAssignees).values({ taskId, userId }).run();
  }
}

async function copyTaskAttachments(db: DB, sourceTaskId: number, targetTaskId: number) {
  const sourceTags = db
    .select({ tagId: taskTags.tagId })
    .from(taskTags)
    .where(eq(taskTags.taskId, sourceTaskId))
    .all()
    .map((r) => r.tagId);
  const sourceAssignees = db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, sourceTaskId))
    .all()
    .map((r) => r.userId);
  linkTags(db, targetTaskId, sourceTags);
  linkAssignees(db, targetTaskId, sourceAssignees);
}

function runCatchUp(db: DB) {
  const rules = db.select().from(recurrenceRules).all();
  for (const rule of rules) {
    catchUp(db, rule.taskId);
  }
}

function taskIdSubquery(db: DB, ids: number[]) {
  return ids.length ? inArray(tasks.id, ids) : sql`${tasks.id} in (select null where 1 = 0)`;
}

function assertUrgency(urgency: number | null | undefined) {
  if (urgency != null && (urgency < 1 || urgency > 5)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Urgency must be between 1 and 5');
  }
}

function assertTitle(title: string | undefined) {
  if (title === undefined) return;
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Title is required and must be at most 200 characters',
    );
  }
}

async function loadRelations(db: DB, task: Task): Promise<TaskRelations> {
  const row = await db.query.tasks.findFirst({
    where: eq(tasks.id, task.id),
    with: {
      tags: { with: { tag: true } },
      assignees: { with: { user: true } },
      comments: true,
      recurrenceRule: true,
    },
  });
  if (!row) throw notFound(`Task ${task.id} not found`);
  const { tags: relTags, assignees: relAssignees, comments: relComments, recurrenceRule } = row;
  return {
    tags: relTags,
    assignees: relAssignees,
    comments: relComments,
    recurrenceRule,
  };
}

export async function getTask(db: DB, id: number): Promise<TaskDto> {
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw notFound(`Task ${id} not found`);
  return serialize(task, await loadRelations(db, task));
}

export async function listTasks(db: DB, filters: TaskFilters = {}): Promise<TaskDto[]> {
  runCatchUp(db);

  const conds = [];
  if (filters.status) conds.push(eq(tasks.status, filters.status));
  if (filters.tag) {
    const ids = db
      .select({ taskId: taskTags.taskId })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(sql`lower(${tags.name}) = ${filters.tag.toLowerCase()}`)
      .all()
      .map((r) => r.taskId);
    conds.push(taskIdSubquery(db, ids));
  }
  if (filters.assignee !== undefined) {
    const ids = db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, filters.assignee))
      .all()
      .map((r) => r.taskId);
    conds.push(taskIdSubquery(db, ids));
  }
  if (filters.urgency === 'high') {
    conds.push(sql`${tasks.urgency} >= 4`);
  } else if (filters.urgency === 'low') {
    conds.push(sql`${tasks.urgency} <= 2`);
  } else if (filters.urgency === 'none') {
    conds.push(sql`${tasks.urgency} is null`);
  }
  if (filters.location) {
    conds.push(sql`lower(${tasks.location}) like ${`%${filters.location.toLowerCase()}%`}`);
  }
  if (filters.finished) {
    conds.push(eq(tasks.status, 'finished'));
  } else {
    conds.push(sql`${tasks.status} != 'finished'`);
  }
  if (!filters.recurring) {
    conds.push(sql`${tasks.parentTaskId} is null`);
  }

  const rows = await db.query.tasks.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [desc(tasks.urgency), asc(tasks.createdAt)],
    with: {
      tags: { with: { tag: true } },
      assignees: { with: { user: true } },
      comments: true,
      recurrenceRule: true,
    },
  });

  return rows.map((row) => {
    const {
      tags: relTags,
      assignees: relAssignees,
      comments: relComments,
      recurrenceRule,
      ...base
    } = row;
    return serialize(base as Task, {
      tags: relTags,
      assignees: relAssignees,
      comments: relComments,
      recurrenceRule,
    });
  });
}

export async function createTask(db: DB, input: CreateTaskInput): Promise<TaskDto> {
  assertTitle(input.title);
  assertUrgency(input.urgency);
  const now = new Date();
  const tagIds = resolveTagIds(db, input.tags ?? []);
  const task = db
    .insert(tasks)
    .values({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: 'to-start',
      location: input.location?.trim() || null,
      urgency: input.urgency ?? null,
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  linkTags(db, task.id, tagIds);
  if (input.assigneeIds?.length) {
    linkAssignees(db, task.id, input.assigneeIds);
  }
  if (input.recurrence) {
    upsertRule(
      db,
      task.id,
      input.recurrence.frequency,
      input.recurrence.interval ?? 1,
      input.dueDate ?? now,
    );
  }
  return getTask(db, task.id);
}

export async function updateTask(db: DB, id: number, input: UpdateTaskInput): Promise<TaskDto> {
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw notFound(`Task ${id} not found`);
  assertTitle(input.title);
  assertUrgency(input.urgency);

  if (input.title !== undefined) {
    await db.update(tasks).set({ title: input.title.trim() }).where(eq(tasks.id, id)).run();
  }
  if (input.description !== undefined) {
    await db
      .update(tasks)
      .set({ description: input.description?.trim() || null })
      .where(eq(tasks.id, id))
      .run();
  }
  if (input.location !== undefined) {
    await db
      .update(tasks)
      .set({ location: input.location?.trim() || null })
      .where(eq(tasks.id, id))
      .run();
  }
  if (input.urgency !== undefined) {
    await db
      .update(tasks)
      .set({ urgency: input.urgency ?? null })
      .where(eq(tasks.id, id))
      .run();
  }
  if (input.dueDate !== undefined) {
    await db
      .update(tasks)
      .set({ dueDate: input.dueDate ?? null })
      .where(eq(tasks.id, id))
      .run();
  }
  if (input.tags !== undefined) {
    const tagIds = resolveTagIds(db, input.tags);
    linkTags(db, id, tagIds);
  }
  if (input.assigneeIds !== undefined) {
    linkAssignees(db, id, input.assigneeIds);
  }
  if (input.recurrence !== undefined) {
    if (input.recurrence) {
      const rule = getRuleForTask(db, id);
      const anchor = rule?.anchorDate ?? input.dueDate ?? task.dueDate ?? new Date();
      upsertRule(db, id, input.recurrence.frequency, input.recurrence.interval ?? 1, anchor);
    } else {
      deleteRuleForTask(db, id);
    }
  }
  await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, id)).run();
  return getTask(db, id);
}

export function deleteTask(db: DB, id: number) {
  const children = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.parentTaskId, id)).all();
  for (const child of children) {
    db.delete(tasks).where(eq(tasks.id, child.id)).run();
  }
  const result = db.delete(tasks).where(eq(tasks.id, id)).run();
  if (result.changes === 0) {
    throw notFound(`Task ${id} not found`);
  }
}

export async function setStatus(db: DB, id: number, status: Status): Promise<TaskDto> {
  if (!isTaskStatus(status)) {
    throw new HttpError(400, 'VALIDATION_ERROR', `Invalid status '${status}'`);
  }
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw notFound(`Task ${id} not found`);
  if (status === task.status) {
    return getTask(db, id);
  }
  if (!isValidTransition(task.status, status)) {
    throw new HttpError(409, 'CONFLICT', `Invalid transition from '${task.status}' to '${status}'`);
  }
  await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, id)).run();

  const sourceTaskId = getSourceTaskId(db, task);
  if (status === 'finished' && sourceTaskId) {
    const next = generateNextInstance(db, sourceTaskId);
    if (next) {
      await copyTaskAttachments(db, sourceTaskId, next.id);
    }
  }
  return getTask(db, id);
}

export function addTaskComment(db: DB, taskId: number, body: string) {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw notFound(`Task ${taskId} not found`);
  return addComment(db, taskId, body, task.status);
}
