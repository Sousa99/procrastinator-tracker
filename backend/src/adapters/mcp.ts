import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { DB } from '../db/client';
import { HttpError } from '../domain/errors';
import { listTags } from '../services/tags';
import {
  addTaskComment,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  setStatus,
  updateTask,
  type TaskFilters,
} from '../services/tasks';
import { listUsers } from '../services/users';

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

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime()))
    throw new HttpError(400, 'VALIDATION_ERROR', `Invalid date '${value}'`);
  return d;
}

export function createMcpServer(db: DB) {
  const server = new McpServer({ name: 'procrastinator-tracker', version: '1.0.0' });

  server.registerTool(
    'task.create',
    {
      title: 'Create task',
      description:
        'Create a new task with an optional description, location, urgency, tags, assignees, due date, and recurrence.',
      inputSchema: {
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        location: z.string().optional(),
        urgency: z.number().int().min(1).max(5).optional(),
        tags: z.array(z.string()).optional(),
        assigneeIds: z.array(z.number().int()).optional(),
        dueDate: z.string().optional(),
        recurrence: recurrenceSchema.optional(),
      },
    },
    async (args) => {
      const task = await createTask(db, {
        title: args.title,
        description: args.description,
        location: args.location,
        urgency: args.urgency,
        tags: args.tags,
        assigneeIds: args.assigneeIds,
        dueDate: toDate(args.dueDate),
        recurrence: args.recurrence
          ? { frequency: args.recurrence.frequency, interval: args.recurrence.interval }
          : null,
      });
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  server.registerTool(
    'task.list',
    {
      title: 'List tasks',
      description:
        'List tasks with optional filters for status, tag, assignee, urgency, location, finished, and recurring.',
      inputSchema: {
        status: taskStatusSchema.optional(),
        tag: z.string().optional(),
        assignee: z.number().int().optional(),
        urgency: z.enum(['high', 'low', 'none']).optional(),
        location: z.string().optional(),
        finished: z.boolean().optional(),
        recurring: z.boolean().optional(),
      },
    },
    async (args) => {
      const filters: TaskFilters = {
        status: args.status,
        tag: args.tag,
        assignee: args.assignee,
        urgency: args.urgency,
        location: args.location,
        finished: args.finished,
        recurring: args.recurring,
      };
      const tasks = await listTasks(db, filters);
      return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
    },
  );

  server.registerTool(
    'task.get',
    {
      title: 'Get task',
      description: 'Get a single task by id with its tags, assignees, and comments.',
      inputSchema: { id: z.number().int() },
    },
    async (args) => {
      const task = await getTask(db, args.id);
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  server.registerTool(
    'task.update',
    {
      title: 'Update task',
      description:
        'Update mutable fields of a task: title, description, location, urgency, tags, assignees, due date, and recurrence.',
      inputSchema: {
        id: z.number().int(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        urgency: z.number().int().min(1).max(5).nullable().optional(),
        tags: z.array(z.string()).optional(),
        assigneeIds: z.array(z.number().int()).optional(),
        dueDate: z.string().nullable().optional(),
        recurrence: recurrenceSchema.nullable().optional(),
      },
    },
    async (args) => {
      const task = await updateTask(db, args.id, {
        title: args.title,
        description: args.description,
        location: args.location,
        urgency: args.urgency,
        tags: args.tags,
        assigneeIds: args.assigneeIds,
        dueDate: args.dueDate === undefined ? undefined : toDate(args.dueDate),
        recurrence:
          args.recurrence === undefined
            ? undefined
            : args.recurrence === null
              ? null
              : { frequency: args.recurrence.frequency, interval: args.recurrence.interval },
      });
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  server.registerTool(
    'task.set_status',
    {
      title: 'Set task status',
      description: 'Transition a task to a new status. Invalid transitions are rejected.',
      inputSchema: { id: z.number().int(), status: taskStatusSchema },
    },
    async (args) => {
      const task = await setStatus(db, args.id, args.status);
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  server.registerTool(
    'task.comment',
    {
      title: 'Add task comment',
      description: 'Add a comment to a task. The comment is stored with the task status context.',
      inputSchema: { id: z.number().int(), body: z.string().min(1) },
    },
    async (args) => {
      const comment = await addTaskComment(db, args.id, args.body);
      return { content: [{ type: 'text', text: JSON.stringify(comment) }] };
    },
  );

  server.registerTool(
    'task.delete',
    {
      title: 'Delete task',
      description: 'Delete a task. Comments, tags, and assignee links are removed with it.',
      inputSchema: { id: z.number().int() },
    },
    async (args) => {
      deleteTask(db, args.id);
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: args.id }) }] };
    },
  );

  server.registerTool(
    'tag.list',
    {
      title: 'List tags',
      description: 'List all tags.',
      inputSchema: {},
    },
    async () => {
      const tags = listTags(db);
      return { content: [{ type: 'text', text: JSON.stringify(tags) }] };
    },
  );

  server.registerTool(
    'user.list',
    {
      title: 'List users',
      description: 'List all users.',
      inputSchema: {},
    },
    async () => {
      const users = listUsers(db);
      return { content: [{ type: 'text', text: JSON.stringify(users) }] };
    },
  );

  return server;
}

export function createMcpHttpApp(db: DB) {
  const server = createMcpServer(db);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    enableJsonResponse: true,
  });
  const ready = server.connect(transport);

  const app = new Hono();
  app.use('/mcp', cors());
  app.all('/mcp', (c) => transport.handleRequest(c.req.raw));
  app.get('/health', (c) => c.json({ status: 'ok' }));

  return { app, ready };
}
