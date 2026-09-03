# MCP Contract: Task Tracker Core

Phase 1 output. The MCP server runs the same backend codebase in `mcp` mode (dual-mode
entry, see [plan.md](../plan.md)). It exposes the task domain as MCP **tools** over the
stdio transport using the MCP TypeScript SDK v2 (`@modelcontextprotocol/server` +
`server/stdio`). All tool input/output schemas use the same zod definitions as the REST
layer.

> **Stdio rule**: in MCP mode never write to stdout (it carries JSON-RPC); log to stderr.

## Server

- **name**: `procrastinator-tracker`
- **version**: `1.0.0`

## Tools

### `task.create`

Create a new task.

**Input:**
| Field | Type | Rules |
|-------|------|-------|
| `title` | string | required, ≤ 200 chars |
| `description` | string | optional |
| `location` | string | optional |
| `urgency` | integer | optional, 1–5 |
| `tags` | string[] | optional, flat labels |
| `assigneeIds` | integer[] | optional |
| `dueDate` | string (ISO) | optional |
| `recurrence` | object | optional `{ frequency: 'daily'\|'weekly'\|'monthly', interval?: number }` |

**Output:** created task object (same shape as REST task).

### `task.list`

List tasks. Filters match the REST query contract (`status`, `tag`, `assignee`,
`urgency`, `location`, `finished`, `recurring`).

**Output:** `{ tasks: Task[] }`.

### `task.get`

**Input:** `{ id: integer }`. **Output:** task with tags, assignees, comments, or error
if missing.

### `task.update`

Update mutable fields (title, description, location, urgency, dueDate, recurrence).

**Input:** `{ id: integer, ...fields }`. **Output:** updated task.

### `task.set_status`

Transition a task's status. **Input:** `{ id: integer, status: Status }`.
Invalid transition → tool error. **Output:** updated task.

### `task.comment`

Add a comment. **Input:** `{ id: integer, body: string }`.
Stores the task's current status with the comment. **Output:** created comment.

### `task.delete`

**Input:** `{ id: integer }`. **Output:** `{ deleted: true }`.

### `tag.list` / `user.list`

List all tags / users. **Output:** `{ tags: Tag[] }` / `{ users: User[] }`.

## Notes

- `Status` = `to-start | started | in-progress | on-hold | validating | finished`.
- Errors surface as MCP tool errors with the same codes as REST (404 missing, 409
  conflict/invalid transition).
- No resources or prompts in v1; tools only.