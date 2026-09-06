import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskStack } from '../src/components/task/TaskStack';
import { sampleTasks } from '../src/components/task/TaskStack.fixtures';
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

describe('TaskStack', () => {
  it('renders one card per task', () => {
    render(<TaskStack tasks={sampleTasks} />);
    sampleTasks.forEach((task) => {
      expect(screen.getByText(task.title)).toBeInTheDocument();
    });
  });

  it('stacks cards so each subsequent card overlaps the previous', () => {
    const { getAllByTestId } = render(<TaskStack tasks={sampleTasks} />);
    const items = getAllByTestId('task-stack-item');
    expect(items).toHaveLength(sampleTasks.length);
    expect(items[0]).not.toHaveClass('task-stack-overlap');
    expect(items[1]).toHaveClass('task-stack-overlap');
  });

  it('orders by urgency descending with unset urgency last', () => {
    const tasks = [
      makeTask({ id: 1, title: 'Low', urgency: 1 }),
      makeTask({ id: 2, title: 'High', urgency: 5 }),
      makeTask({ id: 3, title: 'Unset', urgency: null }),
    ];
    render(<TaskStack tasks={tasks} />);
    const titles = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(titles).toEqual(['High', 'Low', 'Unset']);
  });

  it('caps the number of visible cards with maxVisible', () => {
    const { getAllByTestId } = render(<TaskStack tasks={sampleTasks} maxVisible={3} />);
    expect(getAllByTestId('task-stack-item')).toHaveLength(3);
  });

  it('filters which tasks are shown via the filters prop', () => {
    render(<TaskStack tasks={sampleTasks} filters={{ status: 'in-progress' }} />);
    expect(screen.getByText('Implement MCP tools')).toBeInTheDocument();
    expect(screen.queryByText('Set up project structure')).not.toBeInTheDocument();
  });

  it('renders a custom card via renderCard', () => {
    render(
      <TaskStack
        tasks={sampleTasks}
        renderCard={(task) => <div key={task.id}>custom-{task.title}</div>}
      />,
    );
    expect(screen.getByText('custom-Set up project structure')).toBeInTheDocument();
  });
});
