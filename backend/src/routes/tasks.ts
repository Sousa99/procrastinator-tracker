import { z } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { DB } from '../db/client';
import {
  addTaskComment,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  setStatus,
  updateTask,
} from '../services/tasks';
import { HttpError } from '../domain/errors';

const taskStatusSchema = z.enum([
  'to-start',
  'started',
  'in-progress',
  'on-hold',
  'validating',
  'finished',
]);

const recurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1).optional(),
});

const commentSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  status: taskStatusSchema,
  createdAt: z.string(),
});

const taskSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  location: z.string().nullable(),
  urgency: z.number().int().min(1).max(5).nullable(),
  dueDate: z.string().nullable(),
  parentTaskId: z.number().int().nullable(),
  recurrence: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int(),
    })
    .nullable(),
  tags: z.array(z.string()),
  assignees: z.array(z.object({ id: z.number().int(), name: z.string() })),
  comments: z.array(commentSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const idParam = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: '1' }),
});

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const listQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  tag: z.string().optional(),
  assignee: z.string().optional(),
  urgency: z.enum(['high', 'low', 'none']).optional(),
  location: z.string().optional(),
  finished: z.enum(['true', 'false']).optional(),
  recurring: z.enum(['true', 'false']).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  urgency: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.number().int()).optional(),
  dueDate: z.string().optional(),
  recurrence: recurrenceSchema.optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  urgency: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string()).optional(),
  assigneeIds: z.array(z.number().int()).optional(),
  dueDate: z.string().nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
});

function dateOrUndefined(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, 'VALIDATION_ERROR', `Invalid date '${value}'`);
  }
  return d;
}

function dateOrNullable(value: string | null | undefined): Date | null | undefined {
  if (value === null) return null;
  return dateOrUndefined(value);
}

export function registerTaskRoutes(app: OpenAPIHono, db: DB) {
  app.openapi(
    createRoute({
      method: 'get',
      path: '/api/tasks',
      tags: ['tasks'],
      request: { query: listQuerySchema },
      responses: {
        200: {
          description: 'List of tasks',
          content: { 'application/json': { schema: z.array(taskSchema) } },
        },
      },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const tasks = await listTasks(db, {
        status: q.status,
        tag: q.tag,
        assignee: q.assignee === undefined ? undefined : Number(q.assignee),
        urgency: q.urgency,
        location: q.location,
        finished: q.finished === 'true',
        recurring: q.recurring === 'true',
      });
      return c.json(tasks, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/tasks',
      tags: ['tasks'],
      request: {
        body: { content: { 'application/json': { schema: createTaskSchema } } },
      },
      responses: {
        201: {
          description: 'Created task',
          content: { 'application/json': { schema: taskSchema } },
        },
        400: {
          description: 'Validation error',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const task = await createTask(db, {
        title: body.title,
        description: body.description,
        location: body.location,
        urgency: body.urgency,
        tags: body.tags,
        assigneeIds: body.assigneeIds,
        dueDate: dateOrUndefined(body.dueDate),
        recurrence: body.recurrence
          ? { frequency: body.recurrence.frequency, interval: body.recurrence.interval }
          : null,
      });
      return c.json(task, 201);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/api/tasks/{id}',
      tags: ['tasks'],
      request: { params: idParam },
      responses: {
        200: {
          description: 'Task detail',
          content: { 'application/json': { schema: taskSchema } },
        },
        404: {
          description: 'Not found',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const id = Number(c.req.valid('param').id);
      const task = await getTask(db, id);
      return c.json(task, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/api/tasks/{id}',
      tags: ['tasks'],
      request: {
        params: idParam,
        body: { content: { 'application/json': { schema: updateTaskSchema } } },
      },
      responses: {
        200: {
          description: 'Updated task',
          content: { 'application/json': { schema: taskSchema } },
        },
        404: {
          description: 'Not found',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const id = Number(c.req.valid('param').id);
      const body = c.req.valid('json');
      if (Object.keys(body).length === 0) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'At least one field must be provided');
      }
      const task = await updateTask(db, id, {
        title: body.title,
        description: body.description,
        location: body.location,
        urgency: body.urgency,
        tags: body.tags,
        assigneeIds: body.assigneeIds,
        dueDate: dateOrNullable(body.dueDate),
        recurrence:
          body.recurrence === undefined
            ? undefined
            : body.recurrence === null
              ? null
              : { frequency: body.recurrence.frequency, interval: body.recurrence.interval },
      });
      return c.json(task, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      path: '/api/tasks/{id}',
      tags: ['tasks'],
      request: { params: idParam },
      responses: {
        204: { description: 'Deleted' },
        404: {
          description: 'Not found',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    (c) => {
      const id = Number(c.req.valid('param').id);
      deleteTask(db, id);
      return c.body(null, 204);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/tasks/{id}/status',
      tags: ['tasks'],
      request: {
        params: idParam,
        body: {
          content: {
            'application/json': { schema: z.object({ status: taskStatusSchema }) },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated task',
          content: { 'application/json': { schema: taskSchema } },
        },
        404: {
          description: 'Not found',
          content: { 'application/json': { schema: errorSchema } },
        },
        409: {
          description: 'Invalid transition',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const id = Number(c.req.valid('param').id);
      const { status } = c.req.valid('json');
      const task = await setStatus(db, id, status);
      return c.json(task, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/tasks/{id}/comments',
      tags: ['tasks'],
      request: {
        params: idParam,
        body: {
          content: {
            'application/json': { schema: z.object({ body: z.string().min(1) }) },
          },
        },
      },
      responses: {
        201: {
          description: 'Created comment',
          content: { 'application/json': { schema: commentSchema } },
        },
        404: {
          description: 'Not found',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const id = Number(c.req.valid('param').id);
      const { body } = c.req.valid('json');
      const comment = await addTaskComment(db, id, body);
      return c.json(comment, 201);
    },
  );
}
