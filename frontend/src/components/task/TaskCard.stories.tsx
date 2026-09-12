import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { TaskCard } from './TaskCard';
import { sampleTasks } from './TaskDeck.fixtures';
import type { Task } from '../../api/client';

const meta = {
  title: 'Task/TaskCard',
  component: TaskCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-md">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  argTypes: {
    task: {
      control: false,
      description: 'The task to render on the card.',
    },
  },
} satisfies Meta<typeof TaskCard>;

export default meta;

type Story = StoryObj<typeof meta>;

function byId(id: number): Task {
  const task = sampleTasks.find((t) => t.id === id);
  if (!task) throw new Error(`Fixture task ${id} not found`);
  return task;
}

export const Default: Story = {
  args: {
    task: byId(1),
  },
};

export const Urgent: Story = {
  args: {
    task: byId(3),
  },
};

export const WithDescription: Story = {
  args: {
    task: byId(7),
  },
};

export const Minimal: Story = {
  args: {
    task: byId(6),
  },
};
