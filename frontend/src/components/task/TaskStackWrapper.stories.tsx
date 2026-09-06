import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskStackWrapper } from './TaskStackWrapper';
import { sampleTasks } from './TaskStack.fixtures';

const meta = {
  title: 'Task/TaskStack (self-fetching)',
  component: TaskStackWrapper,
  args: {
    refreshRateMs: 0,
    dataSource: async () => sampleTasks,
  },
  argTypes: {
    refreshRateMs: { control: { type: 'number', min: 0, step: 1000 } },
    dataSource: { control: false },
  },
} satisfies Meta<typeof TaskStackWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Refreshing: Story = {
  args: {
    refreshRateMs: 3000,
  },
};
