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
import {
  taskCommentSchema,
  taskCreateSchema,
  taskListFilterSchema,
  taskSchema,
  taskStatusSchema,
  taskUpdateSchema,
} from '../models/task';

const idParam = z.object({
  id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: '1' }),
});

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export function registerTaskRoutes(app: OpenAPIHono, db: DB) {
  app.openapi(
    createRoute({
      method: 'get',
      path: '/api/tasks',
      tags: ['tasks'],
      request: { query: taskListFilterSchema },
      responses: {
        200: {
          description: 'List of tasks',
          content: { 'application/json': { schema: z.array(taskSchema) } },
        },
      },
    }),
    async (c) => {
      const q = c.req.valid('query');
      const tasks = await listTasks(db, q);
      return c.json(tasks, 200);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/tasks',
      tags: ['tasks'],
      request: {
        body: { content: { 'application/json': { schema: taskCreateSchema } } },
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
      const task = await createTask(db, body);
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
        body: { content: { 'application/json': { schema: taskUpdateSchema.omit({ id: true }) } } },
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
      const task = await updateTask(db, id, body);
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
          content: { 'application/json': { schema: taskCommentSchema } },
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
