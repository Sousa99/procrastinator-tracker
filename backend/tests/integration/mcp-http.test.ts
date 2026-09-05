import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from '../../src/db/client';
import { createMcpHttpApp } from '../../src/mcp';

const INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' },
  },
};

let app: ReturnType<typeof createMcpHttpApp>['app'];
let ready: ReturnType<typeof createMcpHttpApp>['ready'];

beforeEach(async () => {
  const handle = createDb(':memory:');
  migrate(handle.db, { migrationsFolder: './drizzle' });
  const mcp = createMcpHttpApp(handle.db);
  app = mcp.app;
  ready = mcp.ready;
  await ready;
});

async function post(body: unknown, sessionId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await app.request('/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text, sessionId: res.headers.get('mcp-session-id') };
}

describe('MCP HTTP transport', () => {
  it('initializes over HTTP and returns the server identity', async () => {
    const res = await post(INITIALIZE);
    expect(res.status).toBe(200);
    const result = JSON.parse(res.text).result;
    expect(result.serverInfo.name).toBe('procrastinator-tracker');
    expect(result.serverInfo.version).toBe('1.0.0');
    expect(result.capabilities.tools?.listChanged).toBe(true);
    expect(res.sessionId).toBeTruthy();
  });

  it('lists exactly 9 tools after initialize', async () => {
    const init = await post(INITIALIZE);
    const sessionId = init.sessionId ?? '';
    expect(sessionId).toBeTruthy();
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);

    const list = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, sessionId);
    expect(list.status).toBe(200);
    const tools = (JSON.parse(list.text).result.tools as { name: string }[]).map((t) => t.name);
    expect(tools).toHaveLength(9);
    expect(tools).toEqual(
      expect.arrayContaining([
        'task.create',
        'task.list',
        'task.get',
        'task.update',
        'task.set_status',
        'task.comment',
        'task.delete',
        'tag.list',
        'user.list',
      ]),
    );
  });
});
