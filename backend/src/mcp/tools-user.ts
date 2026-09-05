import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { DB } from '../db/client';
import { listUsers } from '../services/users';

/**
 * Registers the user-related tools to the MCP server.
 * @param server The MCP server instance.
 * @param db The database instance.
 */
export const registerUserTools = (server: McpServer, db: DB) => {
  // Register the user.list tool
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
};
