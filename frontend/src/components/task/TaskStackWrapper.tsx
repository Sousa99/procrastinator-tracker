import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, TaskFilters } from '../../api/client';
import { api } from '../../api/client';
import { cn } from '../../lib/utils';
import { TaskStack, type TaskStackProps } from './TaskStack';

export interface TaskStackWrapperProps extends Omit<TaskStackProps, 'tasks' | 'filters'> {
  filters?: TaskFilters;
  refreshRateMs?: number;
  dataSource?: (filters: TaskFilters) => Promise<Task[]>;
}

type LoadState =
  { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'success'; tasks: Task[] };

const hasActiveFilters = (filters: TaskFilters): boolean =>
  Object.values(filters).some((value) => value !== undefined);

const EMPTY_FILTERS: TaskFilters = {};

export function TaskStackWrapper({
  filters = EMPTY_FILTERS,
  refreshRateMs = 30000,
  dataSource = api.listTasks,
  renderCard,
  maxVisible,
  className,
}: TaskStackWrapperProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const filtersRef = useRef(filters);
  const dataSourceRef = useRef(dataSource);

  filtersRef.current = filters;
  dataSourceRef.current = dataSource;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState((prev) => (prev.kind === 'success' ? prev : { kind: 'loading' }));
    try {
      const tasks = await dataSourceRef.current(filtersRef.current);
      if (mounted.current) setState({ kind: 'success', tasks });
    } catch (error) {
      if (mounted.current) {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const prevFilters = useRef(JSON.stringify(filters));
  useEffect(() => {
    const serialized = JSON.stringify(filters);
    if (prevFilters.current !== serialized) {
      prevFilters.current = serialized;
      void load();
    }
  }, [filters, load]);

  useEffect(() => {
    if (refreshRateMs <= 0) return;
    const id = setInterval(() => {
      void load();
    }, refreshRateMs);
    return () => clearInterval(id);
  }, [refreshRateMs, load]);

  return (
    <div className={cn('space-y-3', className)}>
      {state.kind === 'loading' && <p className="text-sm text-slate-400">Loading tasks…</p>}
      {state.kind === 'error' && (
        <p className="text-sm text-red-600">Could not load tasks: {state.message}</p>
      )}
      {state.kind === 'success' &&
        (state.tasks.length === 0 ? (
          <p className="rounded-xl bg-white/60 py-8 text-center text-sm text-slate-400">
            {hasActiveFilters(filters) ? 'No tasks match these filters.' : 'No tasks yet.'}
          </p>
        ) : (
          <TaskStack
            tasks={state.tasks}
            filters={filters}
            renderCard={renderCard}
            maxVisible={maxVisible}
          />
        ))}
    </div>
  );
}
