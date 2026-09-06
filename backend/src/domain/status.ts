import type { TaskStatusDto } from '../models/task';

/**
 * Defines the valid transitions between task statuses.
 * Each key represents a current status, and its value is an array of valid next statuses.
 */
export const TRANSITIONS: Record<TaskStatusDto, readonly TaskStatusDto[]> = {
  'to-start': ['started'],
  started: ['in-progress', 'on-hold', 'to-start'],
  'in-progress': ['on-hold', 'validating', 'started'],
  'on-hold': ['in-progress', 'started'],
  validating: ['finished', 'in-progress'],
  finished: ['started'],
};

/**
 * Checks if transitioning from one task status to another is valid based on the defined transitions.
 * @param from - The current task status.
 * @param to - The desired next task status.
 * @returns True if the transition is valid, false otherwise.
 */
export function isValidTransition(from: TaskStatusDto, to: TaskStatusDto): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Checks whether a value is a valid task status string.
 * @param value - The value to check.
 * @returns True if the value is a valid task status, false otherwise.
 */
export function isTaskStatus(value: string): value is TaskStatusDto {
  return Object.prototype.hasOwnProperty.call(TRANSITIONS, value);
}
