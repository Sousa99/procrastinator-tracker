import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { DB } from '../db/client';
import { listTags } from '../services/tags';

/**
 * Registers tag-related tools to the MCP server.
 * @param server The MCP server instance.
 * @param db The database instance.
 */
export const registerTagTools = (server: McpServer, db: DB) => {
  // Register the tag.list tool
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
};
