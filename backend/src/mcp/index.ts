import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DB } from '../db/client';
import { registerTaskTools } from './tools-task';
import { registerTagTools } from './tools-tag';
import { registerUserTools } from './tools-user';

/**
 * Creates an MCP server instance with registered tools for tasks, tags, and users.
 * @param db The database instance.
 * @returns The MCP server instance.
 */
export function createMcpServer(db: DB) {
  const server = new McpServer({ name: 'procrastinator-tracker', version: '1.0.0' });

  registerTaskTools(server, db);
  registerTagTools(server, db);
  registerUserTools(server, db);

  return server;
}

/**
 * Creates an HTTP application that serves the MCP server and a health check endpoint.
 * @param db The database instance.
 * @returns An object containing the Hono app and a promise that resolves when the server is ready.
 */
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
