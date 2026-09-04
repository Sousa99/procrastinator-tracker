import { z } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { DB } from '../db/client';
import { createUser, deleteUser, listUsers } from '../services/users';

const userSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const idParam = z.object({
  id: z.coerce
    .number()
    .int()
    .openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
});

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export function registerUserRoutes(app: OpenAPIHono, db: DB) {
  app.openapi(
    createRoute({
      method: 'get',
      path: '/api/users',
      tags: ['users'],
      responses: {
        200: {
          description: 'List of users',
          content: { 'application/json': { schema: z.array(userSchema) } },
        },
      },
    }),
    (c) => c.json(listUsers(db), 200),
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/users',
      tags: ['users'],
      request: {
        body: {
          content: {
            'application/json': { schema: z.object({ name: z.string().min(1) }) },
          },
        },
      },
      responses: {
        201: {
          description: 'Created user',
          content: { 'application/json': { schema: userSchema } },
        },
        409: {
          description: 'Duplicate user',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const { name } = c.req.valid('json');
      const user = await createUser(db, name);
      return c.json(user, 201);
    },
  );

  app.openapi(
    createRoute({
      method: 'delete',
      path: '/api/users/{id}',
      tags: ['users'],
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
      const { id } = c.req.valid('param');
      deleteUser(db, id);
      return c.body(null, 204);
    },
  );
}
