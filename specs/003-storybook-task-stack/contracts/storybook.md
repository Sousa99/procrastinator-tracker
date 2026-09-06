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
- `TaskStack` story drives props via **controls** (argTypes) so `filters` and `refreshRateMs`
  are demonstrable. Because `TaskStack` is presentational, the story supplies static sample
  `tasks`; `refreshRateMs` is demonstrated on the **wrapper** story with a mocked `dataSource`
  (avoids hitting the real API in Storybook).
- Existing custom components get at least a basic story (e.g. `TaskCard.stories.tsx`) with
  representative fixture data.

```tsx
// frontend/src/components/task/TaskStack.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaskStack } from './TaskStack';
import { TaskStackWrapper } from './TaskStackWrapper';
import { sampleTasks } from './TaskStack.fixtures';

const meta = { title: 'Task/TaskStack', component: TaskStack, args: { tasks: sampleTasks } } satisfies Meta<typeof TaskStack>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: { tasks: sampleTasks.filter((t) => t.status === 'in-progress') },
};

export const SelfFetchingWrapper: StoryObj<typeof TaskStackWrapper> = {
  render: (args) => <TaskStackWrapper {...args} dataSource={() => Promise.resolve(sampleTasks)} />,
  args: { refreshRateMs: 0 }, // fetch once; controls let you raise it
};
```

## Validation (SC-001, SC-005)

- `pnpm --filter frontend storybook` boots with no broken config.
- The `Task/TaskStack` story renders a stacked deck; filter and refresh-rate controls work.
- At least one existing component (e.g. `Task/TaskCard`) has a story and renders.

## Adding new stories

1. Create `<Component>.stories.tsx` next to the component.
2. Provide `title`, default `Meta`, and at least one `Story`.
3. Use fixture data (co-located `*.fixtures.ts` or inline) — never hit the network in stories
   for presentational components; use a mocked `dataSource` for wrappers.
4. `pnpm --filter frontend storybook` to verify it renders.