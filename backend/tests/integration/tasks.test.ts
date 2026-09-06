import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb, type DB } from '../../src/db/client';
import { createApp } from '../../src/app';

let db: DB;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  const handle = createDb(':memory:');
  db = handle.db;
  migrate(db, { migrationsFolder: './drizzle' });
  app = createApp(db);
});

async function req(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await app.request(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

interface TestTask {
  id: number;
  title: string;
  status: string;
  assignees: { id: number; name: string }[];
  comments: { body: string }[];
}

async function createTask(payload: Record<string, unknown>) {
  const r = await req('POST', '/api/tasks', payload);
  expect(r.status).toBe(201);
  return r.data as TestTask;
}

async function progress(id: number, status: string) {
  return req('POST', `/api/tasks/${id}/status`, { status });
}

describe('task lifecycle (US1)', () => {
  it('creates a task in to-start and progresses through the full workflow', async () => {
    const task = await createTask({ title: 'Write plan', description: 'For Q4' });
    expect(task.status).toBe('to-start');
    expect(task.title).toBe('Write plan');

    const steps = ['started', 'in-progress', 'validating', 'finished'];
    for (const s of steps) {
      const r = await progress(task.id, s);
      expect(r.status).toBe(200);
      expect((r.data as { status: string }).status).toBe(s);
    }
  });

  it('rejects invalid transitions with 409', async () => {
    const task = await createTask({ title: 'Jump' });
    const r = await progress(task.id, 'finished');
    expect(r.status).toBe(409);
    expect((r.data as { error: { code: string } }).error.code).toBe('CONFLICT');
  });

  it('rejects unknown statuses with 400', async () => {
    const task = await createTask({ title: 'Bad' });
    const r = await progress(task.id, 'done');
    expect(r.status).toBe(400);
  });

  it('returns 404 for missing tasks', async () => {
    const r = await req('GET', '/api/tasks/999');
    expect(r.status).toBe(404);
  });

  it('can reopen a finished task', async () => {
    const task = await createTask({ title: 'Reopen' });
    for (const s of ['started', 'in-progress', 'validating', 'finished']) {
      await progress(task.id, s);
    }
    const r = await progress(task.id, 'started');
    expect(r.status).toBe(200);
    expect((r.data as { status: string }).status).toBe('started');
  });

  it('updates and deletes a task', async () => {
    const task = await createTask({ title: 'Orig' });
    const u = await req('PATCH', `/api/tasks/${task.id}`, { title: 'Renamed', urgency: 5 });
    expect(u.status).toBe(200);
    expect((u.data as { title: string; urgency: number }).title).toBe('Renamed');

    const d = await req('DELETE', `/api/tasks/${task.id}`);
    expect(d.status).toBe(204);
    const g = await req('GET', `/api/tasks/${task.id}`);
    expect(g.status).toBe(404);
  });
});

describe('tags and filtering (US2)', () => {
  it('creates tags case-insensitively and rejects duplicates', async () => {
    const t1 = await req('POST', '/api/tags', { name: 'chores' });
    expect(t1.status).toBe(201);
    const t2 = await req('POST', '/api/tags', { name: 'Chores' });
    expect(t2.status).toBe(409);
  });

  it('creates tags implicitly through tasks and filters by tag', async () => {
    await createTask({ title: 'A', tags: ['home'] });
    await createTask({ title: 'B', tags: ['home', 'urgent'] });
    const r = await req('GET', '/api/tasks?tag=home');
    expect(r.status).toBe(200);
    expect((r.data as unknown[]).length).toBe(2);
    const r2 = await req('GET', '/api/tasks?tag=urgent');
    expect((r2.data as unknown[]).length).toBe(1);
  });

  it('filters by status and urgency', async () => {
    const a = await createTask({ title: 'Low', urgency: 1 });
    await createTask({ title: 'High', urgency: 5 });
    for (const s of ['started', 'in-progress', 'validating', 'finished']) {
      await progress(a.id, s);
    }

    const active = await req('GET', '/api/tasks');
    expect((active.data as unknown[]).map((t) => (t as { title: string }).title)).toEqual(['High']);

    const high = await req('GET', '/api/tasks?urgency=high');
    expect((high.data as unknown[]).length).toBe(1);

    const finished = await req('GET', '/api/tasks?finished=true');
    expect((finished.data as unknown[]).length).toBe(1);
    expect((finished.data as { status: string }[])[0]?.status).toBe('finished');
  });

  it('sorts by urgency descending with unset last', async () => {
    await createTask({ title: 'None' });
    await createTask({ title: 'Three', urgency: 3 });
    await createTask({ title: 'One', urgency: 1 });
    const r = await req('GET', '/api/tasks');
    const titles = (r.data as { title: string }[]).map((t) => t.title);
    expect(titles).toEqual(['Three', 'One', 'None']);
  });
});

describe('users and assignment (US3)', () => {
  it('creates users with unique names', async () => {
    const u = await req('POST', '/api/users', { name: 'Alex' });
    expect(u.status).toBe(201);
    const dup = await req('POST', '/api/users', { name: 'Alex' });
    expect(dup.status).toBe(409);
  });

  it('assigns users to tasks and filters by assignee', async () => {
    const u = await req('POST', '/api/users', { name: 'Sam' });
    const userId = (u.data as { id: number }).id;
    const task = await createTask({ title: 'Assigned', assigneeIds: [userId] });
    expect(task.assignees).toEqual([{ id: userId, name: 'Sam' }]);

    const r = await req('GET', `/api/tasks?assignee=${userId}`);
    expect((r.data as unknown[]).length).toBe(1);
  });

  it('validates urgency range', async () => {
    const r = await req('POST', '/api/tasks', { title: 'Bad urgency', urgency: 9 });
    expect(r.status).toBe(400);
  });

  it('deletes a user and unassigns', async () => {
    const u = await req('POST', '/api/users', { name: 'Temp' });
    const userId = (u.data as { id: number }).id;
    await createTask({ title: 'X', assigneeIds: [userId] });
    const d = await req('DELETE', `/api/users/${userId}`);
    expect(d.status).toBe(204);
    const r = await req('GET', `/api/tasks?assignee=${userId}`);
    expect((r.data as unknown[]).length).toBe(0);
  });
});

describe('recurrence (US4)', () => {
  it('generates the next instance when a recurring task is finished', async () => {
    const task = await createTask({
      title: 'Water',
      tags: ['chores'],
      recurrence: { frequency: 'daily', interval: 1 },
    });
    const user = await req('POST', '/api/users', { name: 'R' });
    await req('PATCH', `/api/tasks/${task.id}`, {
      assigneeIds: [(user.data as { id: number }).id],
    });

    for (const s of ['started', 'in-progress', 'validating', 'finished']) {
      await progress(task.id, s);
    }

    const r = await req('GET', '/api/tasks?recurring=true');
    const instances = (
      r.data as { parentTaskId: number | null; title: string; status: string }[]
    ).filter((t) => t.parentTaskId === task.id);
    expect(instances.length).toBe(1);
    expect(instances[0]?.title).toBe('Water');
    expect(instances[0]?.status).toBe('to-start');
  });

  it('copies tags and assignees to the generated instance', async () => {
    const task = await createTask({
      title: 'Workout',
      tags: ['health'],
      recurrence: { frequency: 'daily' },
    });
    const u = await req('POST', '/api/users', { name: 'Gym' });
    const userId = (u.data as { id: number }).id;
    await req('PATCH', `/api/tasks/${task.id}`, { assigneeIds: [userId] });

    for (const s of ['started', 'in-progress', 'validating', 'finished']) {
      await progress(task.id, s);
    }

    const r = await req('GET', '/api/tasks?recurring=true');
    const instance = (
      r.data as {
        parentTaskId: number | null;
        tags: string[];
        assignees: unknown[];
      }[]
    ).find((t) => t.parentTaskId === task.id);
    expect(instance?.tags).toContain('health');
    expect(instance?.assignees).toHaveLength(1);
  });

  it('does not duplicate instances on repeated reads', async () => {
    const task = await createTask({ title: 'Daily', recurrence: { frequency: 'daily' } });
    for (const s of ['started', 'in-progress', 'validating', 'finished']) {
      await progress(task.id, s);
    }
    await req('GET', '/api/tasks?recurring=true');
    await req('GET', '/api/tasks?recurring=true');
    const r = await req('GET', '/api/tasks?recurring=true');
    const instances = (r.data as { parentTaskId: number | null }[]).filter(
      (t) => t.parentTaskId === task.id,
    );
    expect(instances.length).toBe(1);
  });
});

describe('comments (US5)', () => {
  it('adds a comment with status context', async () => {
    const task = await createTask({ title: 'Hold' });
    await progress(task.id, 'started');
    await progress(task.id, 'on-hold');
    const c = await req('POST', `/api/tasks/${task.id}/comments`, { body: 'Blocked' });
    expect(c.status).toBe(201);
    expect((c.data as { status: string }).status).toBe('on-hold');
  });

  it('lists comments chronologically on the task', async () => {
    const task = await createTask({ title: 'Notes' });
    await req('POST', `/api/tasks/${task.id}/comments`, { body: 'First' });
    await req('POST', `/api/tasks/${task.id}/comments`, { body: 'Second' });
    const g = await req('GET', `/api/tasks/${task.id}`);
    const comments = (g.data as { comments: { body: string }[] }).comments;
    expect(comments.map((c) => c.body)).toEqual(['First', 'Second']);
  });

  it('rejects empty comments', async () => {
    const task = await createTask({ title: 'Empty' });
    const c = await req('POST', `/api/tasks/${task.id}/comments`, { body: '   ' });
    expect(c.status).toBe(400);
  });
});

describe('date serialization and query coercion (regression)', () => {
  it('lists tasks as JSON with date fields as ISO strings', async () => {
    await createTask({ title: 'Dated', dueDate: '2026-12-01T10:00:00.000Z' });
    const r = await req('GET', '/api/tasks');
    expect(r.status).toBe(200);
    const task = (r.data as Record<string, unknown>[])[0];
    expect(typeof task?.dueDate).toBe('string');
    expect(task?.dueDate).toBe('2026-12-01T10:00:00.000Z');
    expect(typeof task?.createdAt).toBe('string');
    expect(typeof task?.updatedAt).toBe('string');
  });

  it('creates a task from a string dueDate and echoes it back', async () => {
    const task = await createTask({ title: 'Planned', dueDate: '2026-11-15T09:30:00.000Z' });
    expect((task as unknown as { dueDate: string }).dueDate).toBe('2026-11-15T09:30:00.000Z');
  });

  it('serializes comment createdAt as a string', async () => {
    const task = await createTask({ title: 'Commented' });
    await req('POST', `/api/tasks/${task.id}/comments`, { body: 'Note' });
    const g = await req('GET', `/api/tasks/${task.id}`);
    const comment = (g.data as { comments: { createdAt: unknown }[] }).comments[0];
    expect(typeof comment?.createdAt).toBe('string');
  });

  it('rejects malformed dueDate strings with 400', async () => {
    const r = await req('POST', '/api/tasks', { title: 'Bad date', dueDate: 'not-a-date' });
    expect(r.status).toBe(400);
  });

  it('coerces finished=false query param and excludes finished tasks', async () => {
    const task = await createTask({ title: 'Done' });
    for (const s of ['started', 'in-progress', 'validating', 'finished']) {
      await progress(task.id, s);
    }
    const active = await req('GET', '/api/tasks?finished=false');
    expect(active.status).toBe(200);
    const activeTitles = (active.data as { title: string }[]).map((t) => t.title);
    expect(activeTitles).not.toContain('Done');
  });
});
