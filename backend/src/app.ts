import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { DB } from './db/client';
import { HttpError } from './domain/errors';
import { registerTagRoutes } from './routes/tags';
import { registerTaskRoutes } from './routes/tasks';
import { registerUserRoutes } from './routes/users';

export function createApp(db: DB) {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: result.error.issues[0]?.message ?? 'Invalid request',
            },
          },
          400,
        );
      }
    },
  });

  app.use('/api/*', cors());

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json(
        { error: { code: err.code, message: err.message } },
        err.status as ContentfulStatusCode,
      );
    }
    if (err instanceof ZodError) {
      return c.json(
        {
          error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'Invalid input' },
        },
        400,
      );
    }
    console.error(err);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
  });

  app.notFound((c) =>
    c.json(
      { error: { code: 'NOT_FOUND', message: `Route ${c.req.path} not found` } },
      404 as const,
    ),
  );

  registerTaskRoutes(app, db);
  registerTagRoutes(app, db);
  registerUserRoutes(app, db);

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.doc('/doc', {
    openapi: '3.0.0',
    info: { title: 'Procrastinator Tracker API', version: '1.0.0' },
  });
  app.get('/ui', swaggerUI({ url: '/doc' }));

  return app;
}
