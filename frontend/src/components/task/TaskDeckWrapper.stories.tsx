import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskDeckWrapper } from './TaskDeckWrapper';
import { sampleTasks } from './TaskDeck.fixtures';

const meta = {
  title: 'Task/TaskDeck (self-fetching)',
  component: TaskDeckWrapper,
  args: {
    refreshRateMs: 0,
    autoRotateMs: 0,
    loop: true,
    stackSize: 3,
    slideDurationMs: 500,
    dataSource: async () => sampleTasks,
  },
  argTypes: {
    refreshRateMs: { control: { type: 'number', min: 0, step: 1000 } },
    autoRotateMs: { control: { type: 'number', min: 0, step: 1000 } },
    loop: { control: 'boolean' },
    stackSize: { control: { type: 'number', min: 1, max: 6 } },
    slideDurationMs: { control: { type: 'number', min: 100, max: 2000, step: 100 } },
    dataSource: { control: false },
  },
} satisfies Meta<typeof TaskDeckWrapper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoRotating: Story = {
  args: {
    autoRotateMs: 2000,
  },
};
