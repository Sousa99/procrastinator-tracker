import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskDeck } from '../src/components/task/TaskDeck';
import { sampleTasks } from '../src/components/task/TaskDeck.fixtures';
import type { Task } from '../src/api/client';

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

describe('TaskDeck', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the top card with stacked cards behind it', () => {
    render(<TaskDeck tasks={sampleTasks} autoRotateMs={0} />);
    const topCards = [...sampleTasks]
      .sort((a, b) => {
        if (a.urgency === null && b.urgency === null) return 0;
        if (a.urgency === null) return 1;
        if (b.urgency === null) return -1;
        return b.urgency - a.urgency;
      })
      .slice(0, 3);
    topCards.forEach((task) => {
      expect(screen.getByText(task.title)).toBeInTheDocument();
    });
  });

  it('caps the number of rendered cards with stackSize', () => {
    const { getAllByTestId } = render(
      <TaskDeck tasks={sampleTasks} autoRotateMs={0} stackSize={2} />,
    );
    expect(getAllByTestId('task-deck-card')).toHaveLength(2);
  });

  it('applies filters client-side', () => {
    render(<TaskDeck tasks={sampleTasks} filters={{ status: 'in-progress' }} autoRotateMs={0} />);
    expect(screen.getByText('Implement MCP tools')).toBeInTheDocument();
    expect(screen.queryByText('Set up project structure')).not.toBeInTheDocument();
  });

  it('orders by urgency descending with unset urgency last', () => {
    const tasks = [
      makeTask({ id: 1, title: 'Low', urgency: 1 }),
      makeTask({ id: 2, title: 'High', urgency: 5 }),
      makeTask({ id: 3, title: 'Unset', urgency: null }),
    ];
    render(<TaskDeck tasks={tasks} autoRotateMs={0} />);
    const titles = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(titles).toEqual(['High', 'Low', 'Unset']);
  });

  it('advances the deck on autoRotateMs', async () => {
    vi.useFakeTimers();
    const onCardChange = vi.fn();
    render(<TaskDeck tasks={sampleTasks} autoRotateMs={1000} onCardChange={onCardChange} />);
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.resolve();
    expect(onCardChange).toHaveBeenCalled();
  });

  it('does not auto-advance when autoRotateMs is 0', async () => {
    vi.useFakeTimers();
    const onCardChange = vi.fn();
    render(<TaskDeck tasks={sampleTasks} autoRotateMs={0} onCardChange={onCardChange} />);
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.resolve();
    expect(onCardChange).not.toHaveBeenCalled();
  });

  it('renders a custom card via renderCard', () => {
    const top = [...sampleTasks].sort((a, b) => {
      if (a.urgency === null && b.urgency === null) return 0;
      if (a.urgency === null) return 1;
      if (b.urgency === null) return -1;
      return b.urgency - a.urgency;
    })[0];
    render(
      <TaskDeck
        tasks={sampleTasks}
        autoRotateMs={0}
        renderCard={(task) => <div key={task.id}>custom-{task.title}</div>}
      />,
    );
    expect(screen.getByText(`custom-${top?.title}`)).toBeInTheDocument();
  });
});
