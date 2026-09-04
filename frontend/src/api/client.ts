export type TaskStatus =
  'to-start' | 'started' | 'in-progress' | 'on-hold' | 'validating' | 'finished';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number;
}

export interface Comment {
  id: number;
  body: string;
  status: TaskStatus;
  createdAt: string;
}

export interface Assignee {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  location: string | null;
  urgency: number | null;
  dueDate: string | null;
  parentTaskId: number | null;
  recurrence: Recurrence | null;
  tags: string[];
  assignees: Assignee[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  tag?: string;
  assignee?: number;
  urgency?: 'high' | 'low' | 'none';
  location?: string;
  finished?: boolean;
  recurring?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  location?: string;
  urgency?: number;
  tags?: string[];
  assigneeIds?: number[];
  dueDate?: string;
  recurrence?: { frequency: RecurrenceFrequency; interval?: number };
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  urgency?: number | null;
  tags?: string[];
  assigneeIds?: number[];
  dueDate?: string | null;
  recurrence?: { frequency: RecurrenceFrequency; interval?: number } | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'ERROR',
      body?.error?.message ?? `Request failed with status ${res.status}`,
    );
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function queryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.assignee !== undefined) params.set('assignee', String(filters.assignee));
  if (filters.urgency) params.set('urgency', filters.urgency);
  if (filters.location) params.set('location', filters.location);
  if (filters.finished !== undefined) params.set('finished', String(filters.finished));
  if (filters.recurring !== undefined) params.set('recurring', String(filters.recurring));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  listTasks: (filters: TaskFilters = {}) => request<Task[]>(`/api/tasks${queryString(filters)}`),
  getTask: (id: number) => request<Task>(`/api/tasks/${id}`),
  createTask: (input: CreateTaskInput) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }),
  updateTask: (id: number, input: UpdateTaskInput) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteTask: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  setStatus: (id: number, status: TaskStatus) =>
    request<Task>(`/api/tasks/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  addComment: (id: number, body: string) =>
    request<Comment>(`/api/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  listTags: () => request<Tag[]>('/api/tags'),
  createTag: (name: string) =>
    request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify({ name }) }),

  listUsers: () => request<User[]>('/api/users'),
  createUser: (name: string) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteUser: (id: number) => request<void>(`/api/users/${id}`, { method: 'DELETE' }),
};
