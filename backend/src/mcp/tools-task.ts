import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
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
  taskAddCommentSchema,
  taskCreateSchema,
  taskDeleteSchema,
  taskListFilterSchema,
  taskSetStatusSchema,
  taskUpdateSchema,
  type TaskFiltersDto,
} from '../models/task';
import type { DB } from '../db/client';
import z from 'zod';

/**
 * Registers task-related tools to the MCP server.
 * @param server The MCP server instance.
 * @param db The database instance.
 */
export const registerTaskTools = (server: McpServer, db: DB) => {
  // Register the task.create tool
  server.registerTool(
    'task.create',
    {
      title: 'Create task',
      description:
        'Create a new task with an optional description, location, urgency, tags, assignees, due date, and recurrence.',
      inputSchema: taskCreateSchema,
    },
    async (args) => {
      const task = await createTask(db, {
        title: args.title,
        description: args.description,
        location: args.location,
        urgency: args.urgency,
        tags: args.tags,
        assigneeIds: args.assigneeIds,
        dueDate: args.dueDate,
        recurrence: args.recurrence,
      });
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  // Register the task.list tool
  server.registerTool(
    'task.list',
    {
      title: 'List tasks',
      description:
        'List tasks with optional filters for status, tag, assignee, urgency, location, finished, and recurring.',
      inputSchema: taskListFilterSchema,
    },
    async (args) => {
      const filters: TaskFiltersDto = {
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

  // Register the task.get tool
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

  // Register the task.update tool
  server.registerTool(
    'task.update',
    {
      title: 'Update task',
      description:
        'Update mutable fields of a task: title, description, location, urgency, tags, assignees, due date, and recurrence.',
      inputSchema: taskUpdateSchema,
    },
    async (args) => {
      const task = await updateTask(db, args.id, {
        title: args.title,
        description: args.description,
        location: args.location,
        urgency: args.urgency,
        tags: args.tags,
        assigneeIds: args.assigneeIds,
        dueDate: args.dueDate,
        recurrence: args.recurrence,
      });
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  // Register the task.set_status tool
  server.registerTool(
    'task.set_status',
    {
      title: 'Set task status',
      description: 'Transition a task to a new status. Invalid transitions are rejected.',
      inputSchema: taskSetStatusSchema,
    },
    async (args) => {
      const task = await setStatus(db, args.id, args.status);
      return { content: [{ type: 'text', text: JSON.stringify(task) }] };
    },
  );

  // Register the task.comment tool
  server.registerTool(
    'task.comment',
    {
      title: 'Add task comment',
      description: 'Add a comment to a task. The comment is stored with the task status context.',
      inputSchema: taskAddCommentSchema,
    },
    async (args) => {
      const comment = await addTaskComment(db, args.id, args.body);
      return { content: [{ type: 'text', text: JSON.stringify(comment) }] };
    },
  );

  // Register the task.delete tool
  server.registerTool(
    'task.delete',
    {
      title: 'Delete task',
      description: 'Delete a task. Comments, tags, and assignee links are removed with it.',
      inputSchema: taskDeleteSchema,
    },
    async (args) => {
      deleteTask(db, args.id);
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: args.id }) }] };
    },
  );
};
