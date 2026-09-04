import { z } from '@hono/zod-openapi';
import { createRoute } from '@hono/zod-openapi';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { DB } from '../db/client';
import { createTag, listTags } from '../services/tags';

const tagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export function registerTagRoutes(app: OpenAPIHono, db: DB) {
  app.openapi(
    createRoute({
      method: 'get',
      path: '/api/tags',
      tags: ['tags'],
      responses: {
        200: {
          description: 'List of tags',
          content: { 'application/json': { schema: z.array(tagSchema) } },
        },
      },
    }),
    (c) => c.json(listTags(db), 200),
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/api/tags',
      tags: ['tags'],
      request: {
        body: {
          content: {
            'application/json': { schema: z.object({ name: z.string().min(1) }) },
          },
        },
      },
      responses: {
        201: {
          description: 'Created tag',
          content: { 'application/json': { schema: tagSchema } },
        },
        409: {
          description: 'Duplicate tag',
          content: { 'application/json': { schema: errorSchema } },
        },
      },
    }),
    async (c) => {
      const { name } = c.req.valid('json');
      const tag = await createTag(db, name);
      return c.json(tag, 201);
    },
  );
}
