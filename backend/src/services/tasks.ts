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
import { isValidTransition } from '../domain/status';
import { addComment } from './comments';
import {
  catchUp,
  deleteRuleForTask,
  getRuleForTask,
  getSourceTaskId,
  generateNextInstance,
  upsertRule,
} from './recurrence';
import type {
  TaskAssigneeDto,
  TaskCreateDto,
  TaskDto,
  TaskFiltersDto,
  TaskRecurrenceDto,
  TaskStatusDto,
  TaskTagDto,
  TaskUpdateDto,
} from '../models/task';
import { mapTaskToDto } from '../models/task';
import { getPriorityScope } from '../domain/urgency';

/**
 * Resolves a tag name to its corresponding ID in the database.
 * If the tag does not exist, it will be created.
 * @param db - The database connection.
 * @param name - The name of the tag to resolve.
 * @returns The ID of the tag corresponding to the provided name.
 */
function resolveTagId(db: DB, name: string): number {
  const tag = db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${name.toLowerCase()}`)
    .get();

  if (tag) {
    return tag.id;
  }

  const newTag = db.insert(tags).values({ name }).returning().get();
  return newTag.id;
}

/**
 * Links a task to a set of tags by their IDs.
 * At first all existing tags are deleted and then all new tags are created.
 *
 * This guarantees that the updated set of tags is exactly the same as the provided array of tag names.
 *
 * @param db - The database connection.
 * @param taskId - The ID of the task to link the tags to.
 * @param tagNames - An array of tag names to link to the task.
 */
function linkTags(db: DB, taskId: number, tagIds: number[]) {
  db.delete(taskTags).where(eq(taskTags.taskId, taskId)).run();
  tagIds.forEach((tagId) => {
    db.insert(taskTags).values({ taskId, tagId }).run();
  });
}

/**
 * Links a task to a set of assignees by their IDs.
 * At first all existing assignees are deleted and then all new assignees are created.
 *
 * This guarantees that the updated set of assignees is exactly the same as the provided array of assignee IDs.
 *
 * @param db - The database connection.
 * @param taskId - The ID of the task to link the assignees to.
 * @param userIds - An array of user IDs to link to the task.
 */
function linkAssignees(db: DB, taskId: number, userIds: number[]) {
  db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId)).run();
  userIds.forEach((userId) => {
    db.insert(taskAssignees).values({ taskId, userId }).run();
  });
}

/**
 * Copies the tags and assignees from a source task to a target task.
 * @param db - The database connection.
 * @param sourceTaskId - The ID of the source task to copy from.
 * @param targetTaskId - The ID of the target task to copy to.
 * @throws HttpError if the source task does not exist.
 * @throws HttpError if the target task does not exist.
 */
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

/**
 * Runs the catch-up process for all tasks with recurrence rules.
 * This ensures that any missed instances of recurring tasks are generated.
 * @param db - The database connection.
 * @throws HttpError if any task with a recurrence rule does not exist.
 * @throws HttpError if any recurrence rule is invalid.
 */
function runCatchUp(db: DB) {
  const rules = db.select().from(recurrenceRules).all();
  for (const rule of rules) {
    catchUp(db, rule.taskId);
  }
}

/**
 * Generates a SQL subquery to filter tasks by their IDs.
 * If the provided array of IDs is empty, the subquery will return no results.
 * @param db - The database connection.
 * @param ids - An array of task IDs to filter by.
 * @returns A SQL condition that can be used in a WHERE clause to filter tasks by their IDs.
 */
function taskIdSubquery(
  db: DB,
  ids: number[],
): ReturnType<typeof inArray> | ReturnType<typeof sql> {
  if (!ids.length) {
    return sql`${tasks.id} in (select null where 1 = 0)`;
  }

  return inArray(tasks.id, ids);
}

/**
 * Loads the relations (tags, assignees, comments, recurrence rule) for a given task.
 * @param db - The database connection.
 * @param task - The task for which to load relations.
 * @returns An object containing the loaded relations for the task.
 * @throws HttpError if the task does not exist.
 */
async function loadRelations(
  db: DB,
  task: Task,
): Promise<{
  tags: TaskTagDto[];
  assignees: TaskAssigneeDto[];
  comments: { id: number; body: string; status: TaskStatusDto; createdAt: Date }[];
  recurrenceRule: TaskRecurrenceDto | null;
}> {
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
    tags: relTags.map((t) => t.tag.name).sort(),
    assignees: relAssignees.map((a) => ({ id: a.user.id, name: a.user.name })),
    comments: relComments,
    recurrenceRule,
  };
}

/**
 * Retrieves a task by its ID, including its tags, assignees, comments, and recurrence rule.
 * @param db - The database connection.
 * @param id - The ID of the task to retrieve.
 * @returns The task with its relations as a TaskDto.
 * @throws HttpError if the task does not exist.
 */
export async function getTask(db: DB, id: number): Promise<TaskDto> {
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw notFound(`Task ${id} not found`);

  const relations = await loadRelations(db, task);
  return mapTaskToDto(task, relations);
}

/**
 * Lists tasks based on the provided filters, including their tags, assignees, comments, and recurrence rules.
 *
 * It will also catch up any missed instances of recurring tasks before listing them.
 *
 * @param db - The database connection.
 * @param filters - Optional filters to apply when listing tasks.
 * @returns An array of TaskDto objects matching the filters.
 */
export async function listTasks(db: DB, filters: TaskFiltersDto = {}): Promise<TaskDto[]> {
  runCatchUp(db);

  const addStatusFilter = (conds: ReturnType<typeof sql>[]) => {
    if (!filters.status) return;
    conds.push(eq(tasks.status, filters.status));
  };

  const addTagFilter = (conds: ReturnType<typeof sql>[]) => {
    if (!filters.tag) return;
    const ids = db
      .select({ taskId: taskTags.taskId })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(sql`lower(${tags.name}) = ${filters.tag.toLowerCase()}`)
      .all()
      .map((r) => r.taskId);
    conds.push(taskIdSubquery(db, ids));
  };

  const addAssigneeFilter = (conds: ReturnType<typeof sql>[]) => {
    if (filters.assignee === undefined) return;
    const ids = db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, filters.assignee))
      .all()
      .map((r) => r.taskId);
    conds.push(taskIdSubquery(db, ids));
  };

  const addUrgencyFilter = (conds: ReturnType<typeof sql>[]) => {
    if (!filters.urgency) return;
    const priorityScope = getPriorityScope(filters.urgency);
    conds.push(
      sql`${tasks.urgency} >= ${priorityScope.floor} AND ${tasks.urgency} <= ${priorityScope.ceil}`,
    );
  };

  const addLocationFilter = (conds: ReturnType<typeof sql>[]) => {
    if (!filters.location) return;
    conds.push(sql`lower(${tasks.location}) like ${`%${filters.location.toLowerCase()}%`}`);
  };

  const addFinishedFilter = (conds: ReturnType<typeof sql>[]) => {
    if (filters.finished) {
      conds.push(eq(tasks.status, 'finished'));
    } else {
      conds.push(sql`${tasks.status} != 'finished'`);
    }
  };

  const addRecurringFilter = (conds: ReturnType<typeof sql>[]) => {
    if (filters.recurring) return;
    conds.push(sql`${tasks.parentTaskId} is null`);
  };

  let conds: ReturnType<typeof sql>[] = [];
  addStatusFilter(conds);
  addTagFilter(conds);
  addAssigneeFilter(conds);
  addUrgencyFilter(conds);
  addLocationFilter(conds);
  addFinishedFilter(conds);
  addRecurringFilter(conds);

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

    const relations = {
      tags: relTags.map((t) => t.tag.name).sort(),
      assignees: relAssignees.map((a) => ({ id: a.user.id, name: a.user.name })),
      comments: relComments,
      recurrenceRule,
    };

    return mapTaskToDto(base, relations);
  });
}

/**
 * Creates a new task in the database based on the provided TaskCreateDto.
 * It also links the task to its tags, assignees, and recurrence rule if provided.
 * @param db - The database connection.
 * @param input - The TaskCreateDto containing the details of the task to create.
 * @returns The newly created task as a TaskDto.
 */
export async function createTask(db: DB, input: TaskCreateDto): Promise<TaskDto> {
  const now = new Date();
  const tagIds = input.tags?.map((name) => resolveTagId(db, name)) || [];

  const taskValue = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: 'to-start' as const,
    location: input.location?.trim() || null,
    urgency: input.urgency ?? null,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const task = db.insert(tasks).values(taskValue).returning().get();

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

/**
 * Updates an existing task in the database based on the provided TaskUpdateDto.
 * It also updates the task's tags, assignees, and recurrence rule if provided.
 * @param db - The database connection.
 * @param id - The ID of the task to update.
 * @param input - The TaskUpdateDto containing the updated details of the task.
 * @returns The updated task as a TaskDto.
 * @throws HttpError if the task does not exist.
 */
export async function updateTask(
  db: DB,
  id: number,
  input: Omit<TaskUpdateDto, 'id'>,
): Promise<TaskDto> {
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) throw notFound(`Task ${id} not found`);

  const updateTitle = async () => {
    if (input.title === undefined) return;
    await db.update(tasks).set({ title: input.title.trim() }).where(eq(tasks.id, id)).run();
  };

  const updateDescription = async () => {
    if (input.description === undefined) return;
    await db
      .update(tasks)
      .set({ description: input.description?.trim() || null })
      .where(eq(tasks.id, id))
      .run();
  };

  const updateLocation = async () => {
    if (input.location === undefined) return;
    await db
      .update(tasks)
      .set({ location: input.location?.trim() || null })
      .where(eq(tasks.id, id))
      .run();
  };

  const updateUrgency = async () => {
    if (input.urgency === undefined) return;
    await db
      .update(tasks)
      .set({ urgency: input.urgency ?? null })
      .where(eq(tasks.id, id))
      .run();
  };

  const updateDueDate = async () => {
    if (input.dueDate === undefined) return;
    await db
      .update(tasks)
      .set({ dueDate: input.dueDate ?? null })
      .where(eq(tasks.id, id))
      .run();
  };

  const updateTags = async () => {
    if (input.tags === undefined) return;
    const tagIds = input.tags.map((name) => resolveTagId(db, name));
    linkTags(db, id, tagIds);
  };

  const updateAssignees = async () => {
    if (input.assigneeIds === undefined) return;
    linkAssignees(db, id, input.assigneeIds);
  };

  const updateRecurrence = async () => {
    if (input.recurrence === undefined) return;
    if (input.recurrence) {
      const rule = getRuleForTask(db, id);
      const anchor = rule?.anchorDate ?? input.dueDate ?? task.dueDate ?? new Date();
      upsertRule(db, id, input.recurrence.frequency, input.recurrence.interval ?? 1, anchor);
    } else {
      deleteRuleForTask(db, id);
    }
  };

  await Promise.all([
    updateTitle(),
    updateDescription(),
    updateLocation(),
    updateUrgency(),
    updateDueDate(),
    updateTags(),
    updateAssignees(),
    updateRecurrence(),
  ]);

  await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, id)).run();
  return getTask(db, id);
}

/**
 * Deletes a task and its child tasks from the database.
 * @param db - The database connection.
 * @param id - The ID of the task to delete.
 * @throws HttpError if the task does not exist.
 */
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

export async function setStatus(db: DB, id: number, status: TaskStatusDto): Promise<TaskDto> {
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

/**
 * Add a comment to a task.
 * @param db - The database connection.
 * @param taskId - The ID of the task to add the comment to.
 * @param body - The body of the comment.
 * @returns The newly created comment.
 * @throws HttpError if the task does not exist.
 */
export function addTaskComment(db: DB, taskId: number, body: string) {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();

  if (!task) throw notFound(`Task ${taskId} not found`);
  return addComment(db, taskId, body, task.status);
}
