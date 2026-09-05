import type { TaskUrgencyDto } from '../models/task';

type UrgencyScope = {
  floor: number;
  ceil: number;
};

/**
 * Maps task urgency levels to their corresponding priority scopes.
 * Each urgency level is associated with a range of priority values (floor and ceil).
 */
export const PRIORITY_MAPPER: Record<TaskUrgencyDto, UrgencyScope> = {
  none: { floor: 0, ceil: 2 },
  low: { floor: 3, ceil: 4 },
  high: { floor: 5, ceil: 5 },
};

/**
 * Maps a task urgency level to its corresponding priority value.
 * The priority value is calculated as the average of the floor and ceil values for the given urgency level.
 * @param urgency - The task urgency level (none, low, high).
 * @returns The calculated priority value as a number.
 */
export function mapUrgencyToPriority(urgency: TaskUrgencyDto): number {
  const scope = PRIORITY_MAPPER[urgency];
  return Math.floor((scope.floor + scope.ceil) / 2);
}

/**
 * Retrieves the priority scope (floor and ceil values) for a given task urgency level.
 * @param urgency - The task urgency level (none, low, high).
 * @returns An object containing the floor and ceil values for the specified urgency level.
 */
export function getPriorityScope(urgency: TaskUrgencyDto): UrgencyScope {
  return PRIORITY_MAPPER[urgency];
}
