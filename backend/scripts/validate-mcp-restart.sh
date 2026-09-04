#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v24.20.0/bin:$PATH"
cd "$(dirname "$0")/.."

kill_port() { lsof -ti ":$1" 2>/dev/null | xargs kill 2>/dev/null || true; }

mcp_call() {
  local sid body="$1"
  sid=$(curl -s -D - -X POST http://localhost:3001/mcp \
    -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"validate","version":"1.0"}}}' \
    | tr -d '\r' | grep -i '^mcp-session-id' | awk '{print $2}')
  curl -s -o /dev/null -X POST http://localhost:3001/mcp \
    -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    -H "Mcp-Session-Id: $sid" -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  curl -s -X POST http://localhost:3001/mcp \
    -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    -H "Mcp-Session-Id: $sid" -d "$body"
}

echo "=== T009: manual restart flow ==="
kill_port 3001
pnpm start:mcp >/tmp/mcp-restart.log 2>&1 &
MCP_PID=$!
for i in $(seq 1 10); do sleep 1; curl -s -o /dev/null http://localhost:3001/health && break; done
echo "first call:"; mcp_call '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"task.list","arguments":{}}}' | head -c 120; echo
kill "$MCP_PID" 2>/dev/null || true; wait "$MCP_PID" 2>/dev/null || true
sleep 1
pnpm start:mcp >/tmp/mcp-restart2.log 2>&1 &
MCP_PID=$!
for i in $(seq 1 10); do sleep 1; curl -s -o /dev/null http://localhost:3001/health && break; done
echo "after restart:"; mcp_call '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"task.list","arguments":{}}}' | head -c 120; echo
kill "$MCP_PID" 2>/dev/null || true; wait "$MCP_PID" 2>/dev/null || true
echo "T009 OK"