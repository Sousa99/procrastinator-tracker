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
    filters: {
      control: 'object',
      description: 'Filters passed to the data source; changes trigger a refetch.',
    },
    refreshRateMs: {
      control: { type: 'number', min: 0, step: 1000 },
      description: 'Poll interval (ms) for automatic re-fetch; 0 disables polling.',
    },
    dataSource: {
      control: false,
      description:
        'Injectable fetch function (filters) => Promise<Task[]>; defaults to the API client.',
    },
    autoRotateMs: {
      control: { type: 'number', min: 0, step: 1000 },
      description:
        'Interval (ms) for auto-advancing the deck; 0 disables. Pauses during a drag and resets after a manual skip.',
    },
    loop: {
      control: 'boolean',
      description: 'When true, wrap back to the first task instead of showing the empty state.',
    },
    stackSize: {
      control: { type: 'number', min: 1, max: 6 },
      description: 'Number of visible cards (the top card plus the cards fanned behind it).',
    },
    slideDurationMs: {
      control: { type: 'number', min: 100, max: 2000, step: 100 },
      description: 'Duration (ms) of the swipe/exit card animation.',
    },
    renderCard: {
      control: false,
      description: 'Optional per-card render override; defaults to a full TaskDeckCard.',
    },
    className: {
      control: 'text',
      description: 'Optional class names for the wrapper.',
    },
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
