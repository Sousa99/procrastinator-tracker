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
    slideDurationMs: 500,
  },
  argTypes: {
    tasks: {
      control: false,
      description: 'The tasks to render in the deck.',
    },
    filters: {
      control: 'object',
      description:
        'Applied client-side for ordering/emphasis; actual filtering happens at fetch time in the wrapper.',
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
    onCardChange: {
      control: false,
      description:
        'Called with the new index whenever the top card changes (auto-rotate or manual swipe).',
    },
    className: {
      control: 'text',
      description: 'Optional class names for the deck stage.',
    },
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
