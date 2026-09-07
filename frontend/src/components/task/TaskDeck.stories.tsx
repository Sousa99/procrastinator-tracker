import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskDeck } from './TaskDeck';
import { sampleTasks } from './TaskDeck.fixtures';

const meta = {
  title: 'Task/TaskDeck',
  component: TaskDeck,
  args: {
    tasks: sampleTasks,
    autoRotateMs: 0,
    loop: true,
    stackSize: 3,
  },
  argTypes: {
    tasks: { control: false },
    filters: { control: 'object' },
    autoRotateMs: { control: { type: 'number', min: 0, step: 1000 } },
    loop: { control: 'boolean' },
    stackSize: { control: { type: 'number', min: 1, max: 6 } },
  },
} satisfies Meta<typeof TaskDeck>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    tasks: sampleTasks.filter((task) => task.status === 'in-progress'),
  },
};

export const AutoRotating: Story = {
  args: {
    autoRotateMs: 2000,
  },
};

export const NoLoop: Story = {
  args: {
    loop: false,
    stackSize: 3,
  },
};
