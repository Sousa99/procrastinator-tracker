export const TASK_STATUSES = [
  'to-start',
  'started',
  'in-progress',
  'on-hold',
  'validating',
  'finished',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  'to-start': ['started'],
  started: ['in-progress', 'on-hold', 'to-start'],
  'in-progress': ['on-hold', 'validating', 'started'],
  'on-hold': ['in-progress', 'started'],
  validating: ['finished', 'in-progress'],
  finished: ['started'],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}
