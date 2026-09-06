import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskStack } from './TaskStack';
import { sampleTasks } from './TaskStack.fixtures';

const meta = {
  title: 'Task/TaskStack',
  component: TaskStack,
  args: {
    tasks: sampleTasks,
  },
  argTypes: {
    tasks: { control: false },
    filters: { control: 'object' },
    maxVisible: { control: { type: 'number', min: 1, max: 10 } },
  },
} satisfies Meta<typeof TaskStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    tasks: sampleTasks.filter((task) => task.status === 'in-progress'),
  },
};

export const Capped: Story = {
  args: {
    maxVisible: 3,
  },
};

export const CustomCard: Story = {
  args: {
    renderCard: (task) => (
      <div
        key={task.id}
        className="rounded-xl border border-amber-200/70 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm"
      >
        ★ {task.title}
      </div>
    ),
  },
};
