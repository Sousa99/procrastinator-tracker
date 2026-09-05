import { z } from 'zod';
import type { Task } from '../db/schema';

// =======================================================
// Task-related schemas for validation
// ===============================================================

/**
 * Task assignee schema for validation.
 */
export const taskAssigneeSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(100),
});

/**
 * Task filters schema for validation.
 */
export const taskRecurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1).optional(),
});

/**
 * Task status schema for validation.
 */
export const taskStatusSchema = z.enum([
  'to-start',
  'started',
  'in-progress',
  'on-hold',
  'validating',
  'finished',
]);

/**
 * Task urgency schema for validation.
 */
export const taskUrgencySchema = z.enum(['high', 'low', 'none']);

/**
 * Task comment schema for validation.
 */
export const taskCommentSchema = z.object({
  id: z.number().int(),
  body: z.string().min(1),
  status: taskStatusSchema,
  createdAt: z.date(),
});

/**
 * Task schema for validation.
 */
export const taskSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  status: taskStatusSchema,
  location: z.string().nullable(),
  urgency: z.number().int().min(1).max(5).nullable(),
  dueDate: z.date().nullable(),
  parentTaskId: z.number().int().nullable(),
  recurrence: taskRecurrenceSchema.nullable(),
  tags: z.array(z.string()),
  assignees: z.array(taskAssigneeSchema),
  comments: z.array(taskCommentSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Task creation schema for validation.
 */
export const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.number().int()).optional(),
  dueDate: z.date().optional(),
  recurrence: taskRecurrenceSchema.optional(),
});

/**
 * Task update schema for validation.
 */
export const taskUpdateSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  urgency: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.number().int()).optional(),
  dueDate: z.date().nullable().optional(),
  recurrence: taskRecurrenceSchema.nullable().optional(),
});

/**
 * Task delete schema for validation.
 */
export const taskDeleteSchema = z.object({
  id: z.number().int(),
});

/**
 * Task list schema for validation.
 */
export const taskListFilterSchema = z.object({
  status: taskStatusSchema.optional(),
  tag: z.string().optional(),
  assignee: z.number().int().optional(),
  urgency: taskUrgencySchema.optional(),
  location: z.string().optional(),
  finished: z.boolean().optional(),
  recurring: z.boolean().optional(),
});

/**
 * Task set status schema for validation.
 */
export const taskSetStatusSchema = z.object({
  id: z.number().int(),
  status: taskStatusSchema,
});

/**
 * Task add comment schema for validation.
 */
export const taskAddCommentSchema = z.object({
  id: z.number().int(),
  body: z.string().min(1),
});

// =======================================================
// Types for task-related data transfer objects (DTOs)
// ===============================================================

export type TaskUrgencyDto = z.infer<typeof taskUrgencySchema>;
export type TaskStatusDto = z.infer<typeof taskStatusSchema>;

export type TaskTagDto = string;
export type TaskAssigneeDto = z.infer<typeof taskAssigneeSchema>;
export type TaskCommentDto = z.infer<typeof taskCommentSchema>;
export type TaskRecurrenceDto = z.infer<typeof taskRecurrenceSchema>;
export type TaskDto = z.infer<typeof taskSchema>;

export type TaskFiltersDto = z.infer<typeof taskListFilterSchema>;

export type TaskCreateDto = z.infer<typeof taskCreateSchema>;
export type TaskUpdateDto = z.infer<typeof taskUpdateSchema>;

// =======================================================
// Mappers for converting between database models and DTOs
// ===============================================================

interface TaskRelations {
  tags: TaskTagDto[];
  assignees: TaskAssigneeDto[];
  comments: TaskCommentDto[];
  recurrenceRule: TaskRecurrenceDto | null;
}

/**
 * Maps a Task database model and its relations to a TaskDto.
 * @param task - The Task database model.
 * @param rel - The relations associated with the task (tags, assignees, comments, recurrence rule).
 * @returns A TaskDto representing the task and its relations.
 */
export const mapTaskToDto = (task: Task, rel: TaskRelations): TaskDto => {
  return taskSchema.parse({
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
    tags: rel.tags.map((t) => t).sort(),
    assignees: rel.assignees.map((a) => ({ id: a.id, name: a.name })),
    comments: rel.comments.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
};
