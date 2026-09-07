# Contract: Storybook Integration

Storybook setup and story-writing contract for the frontend. The workbench lives in
`frontend/.storybook/`, consumes the same Tailwind v4 source (`src/index.css`), and hosts
stories co-located with components.

## Setup

```ts
// frontend/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  viteFinal: (config) => {
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    return config;
  },
};

export default config;
```

> Storybook 9 note: the essentials addons (controls, actions, viewport, …) are built into core —
> no `@storybook/addon-essentials` dependency or `addons` array is needed.

```ts
// frontend/.storybook/preview.ts
import '../src/index.css'; // Tailwind v4 — same source of truth as the app
```

**Scripts** (`frontend/package.json`):

```jsonc
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build -o dist-storybook"
  }
}
```

Run from repo root: `pnpm --filter frontend storybook` → http://localhost:6006. Static build
output goes to `frontend/dist-storybook/` (SPA app → `dist-app/`, library → `dist-lib/`).

## Tailwind v4 note

No `postcss.config` is needed: the `@tailwindcss/vite` plugin (already used by the app's
`vite.config.ts`) is added to Storybook's `viteFinal`. Because Tailwind v4 scans the source
tree, the same `index.css` emits styles for both app and preview iframe — one styling source.

## Story-writing contract

- Stories are co-located: `ComponentName.stories.tsx` next to the component.
- Use `@storybook/react-vite`'s `Meta` / `StoryObj` types.
- `TaskDeck` story drives props via **controls** (argTypes) so `autoRotateMs`, `loop`,
  `stackSize`, and `filters` are demonstrable. Because `TaskDeck` is presentational, the story
  supplies static sample `tasks`; `refreshRateMs` is demonstrated on the **wrapper** story with
  a mocked `dataSource` (avoids hitting the real API in Storybook). In stories, use
  `autoRotateMs` sparingly (or `0`) so the deck doesn't spin out from under the preview.
- Existing custom components get at least a basic story (e.g. `TaskCard.stories.tsx`) with
  representative fixture data.

```tsx
// frontend/src/components/task/TaskDeck.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskDeck } from './TaskDeck';
import { TaskDeckWrapper } from './TaskDeckWrapper';
import { sampleTasks } from './TaskDeck.fixtures';

const meta = {
  title: 'Task/TaskDeck',
  component: TaskDeck,
  args: { tasks: sampleTasks, autoRotateMs: 0, loop: true, stackSize: 3 },
} satisfies Meta<typeof TaskDeck>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: { tasks: sampleTasks.filter((t) => t.status === 'in-progress') },
};

export const SelfFetchingWrapper: StoryObj<typeof TaskDeckWrapper> = {
  render: (args) => (
    <TaskDeckWrapper {...args} dataSource={() => Promise.resolve(sampleTasks)} autoRotateMs={0} />
  ),
  args: { refreshRateMs: 0 }, // fetch once; controls let you raise it
};
```

## Validation (SC-001, SC-005)

- `pnpm --filter frontend storybook` boots with no broken config.
- The `Task/TaskDeck` story renders a swipeable card stack; auto-rotate, loop, and stack-size
  controls work; dragging the top card advances the deck.
- At least one existing component (e.g. `Task/TaskCard`) has a story and renders.

## Adding new stories

1. Create `<Component>.stories.tsx` next to the component.
2. Provide `title`, default `Meta`, and at least one `Story`.
3. Use fixture data (co-located `*.fixtures.ts` or inline) — never hit the network in stories
   for presentational components; use a mocked `dataSource` for wrappers.
4. `pnpm --filter frontend storybook` to verify it renders.