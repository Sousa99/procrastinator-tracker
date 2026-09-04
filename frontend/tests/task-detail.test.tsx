import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TaskDetailPage from '../src/pages/TaskDetailPage';
import { api } from '../src/api/client';
import type { Task } from '../src/api/client';

vi.mock('../src/api/client', () => ({
  api: {
    getTask: vi.fn(),
    listUsers: vi.fn(),
    setStatus: vi.fn(),
    addComment: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderDetail(id = 1) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tasks/${id}`]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'Fix the leak',
    description: 'Kitchen sink',
    status: 'to-start',
    location: 'Home',
    urgency: 4,
    dueDate: null,
    parentTaskId: null,
    recurrence: null,
    tags: ['chores'],
    assignees: [],
    comments: [],
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.getTask).mockResolvedValue(makeTask({}));
  vi.mocked(api.listUsers).mockResolvedValue([]);
  vi.mocked(api.setStatus).mockResolvedValue(makeTask({ status: 'started' }));
  vi.mocked(api.addComment).mockResolvedValue({
    id: 1,
    body: 'note',
    status: 'to-start',
    createdAt: '2026-09-04T00:00:00.000Z',
  });
  queryClient.clear();
});

describe('TaskDetailPage', () => {
  it('renders task fields and status badge', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: /Fix the leak/i })).toBeInTheDocument();
    expect(screen.getByText('Kitchen sink')).toBeInTheDocument();
    expect(screen.getByText('to-start')).toBeInTheDocument();
  });

  it('shows status controls with the allowed transition', async () => {
    renderDetail();
    const startButton = await screen.findByRole('button', { name: /^started$/i });
    expect(startButton).toBeInTheDocument();
  });

  it('lists comments', async () => {
    vi.mocked(api.getTask).mockResolvedValue(
      makeTask({
        comments: [
          {
            id: 1,
            body: 'Blocked on parts',
            status: 'on-hold',
            createdAt: '2026-09-04T00:00:00.000Z',
          },
        ],
      }),
    );
    renderDetail();
    expect(await screen.findByText('Blocked on parts')).toBeInTheDocument();
  });

  it('adds a comment through the form', async () => {
    const user = userEvent.setup();
    renderDetail();
    const textarea = await screen.findByPlaceholderText(/Add a note/i);
    await user.type(textarea, 'A new note');
    await user.click(screen.getByRole('button', { name: /Add comment/i }));
    expect(api.addComment).toHaveBeenCalledWith(1, 'A new note');
  });
});
