import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from '../src/pages/DashboardPage';
import { api } from '../src/api/client';
import type { Task } from '../src/api/client';

vi.mock('../src/api/client', () => ({
  api: {
    listTasks: vi.fn(),
    listTags: vi.fn(),
    listUsers: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'Sample',
    description: null,
    status: 'to-start',
    location: null,
    urgency: null,
    dueDate: null,
    parentTaskId: null,
    recurrence: null,
    tags: [],
    assignees: [],
    comments: [],
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.listTasks).mockResolvedValue([]);
  vi.mocked(api.listTags).mockResolvedValue([]);
  vi.mocked(api.listUsers).mockResolvedValue([]);
  queryClient.clear();
});

describe('DashboardPage', () => {
  it('shows the empty state in list mode when there are no tasks', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'list' }));
    expect(await screen.findByText(/No active tasks/i)).toBeInTheDocument();
  });

  it('shows active tasks first and finished tasks separated in list mode', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([
      makeTask({ id: 1, title: 'Active task', status: 'started' }),
      makeTask({ id: 2, title: 'Done task', status: 'finished' }),
    ]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'list' }));

    expect(await screen.findByText('Active task')).toBeInTheDocument();
    const heading = screen.getByText(/Done \(1\)/);
    expect(heading).toBeInTheDocument();
  });

  it('renders the add-task form toggle', async () => {
    renderPage();
    const toggle = screen.getByRole('button', { name: /add a task/i });
    toggle.click();
    expect(await screen.findByLabelText(/Task$/i)).toBeInTheDocument();
  });

  it('shows a message when filters match nothing in list mode', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'list' }));
    expect(await screen.findByText(/No active tasks/i)).toBeInTheDocument();
  });

  it('renders the deck in deck mode by default', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([
      makeTask({ id: 1, title: 'Deck task', status: 'started', urgency: 5 }),
    ]);
    renderPage();
    expect(await screen.findByText('Deck task')).toBeInTheDocument();
  });

  it('switches between deck and list modes', async () => {
    vi.mocked(api.listTasks).mockResolvedValue([
      makeTask({ id: 1, title: 'Deck task', status: 'started', urgency: 5 }),
    ]);
    renderPage();
    expect(await screen.findByText('Deck task')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'list' }));
    expect(await screen.findByText('Deck task')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'deck' }));
    expect(await screen.findByText('Deck task')).toBeInTheDocument();
  });
});
