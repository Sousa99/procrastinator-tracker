import { useSetStatus } from '../../api/tasks';
import type { Task, TaskStatus } from '../../api/client';
import { Button } from '../ui/button';

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'to-start': ['started'],
  started: ['in-progress', 'on-hold', 'to-start'],
  'in-progress': ['on-hold', 'validating', 'started'],
  'on-hold': ['in-progress', 'started'],
  validating: ['finished', 'in-progress'],
  finished: ['started'],
};

const nextLabel: Record<TaskStatus, string> = {
  'to-start': 'start',
  started: 'work on it',
  'in-progress': 'review',
  'on-hold': 'unhold',
  validating: 'finish',
  finished: 'reopen',
};

const finishStatuses = new Set<TaskStatus>(['validating']);

interface StatusControlsProps {
  task: Task;
  onChanged?: () => void;
}

export function StatusControls({ task, onChanged }: StatusControlsProps) {
  const setStatus = useSetStatus();

  const targets = TRANSITIONS[task.status];

  async function go(target: TaskStatus) {
    try {
      await setStatus.mutateAsync({ id: task.id, status: target });
      onChanged?.();
    } catch {
      // surface via react-query error boundary/console; keep UI responsive
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Move to:</span>
      {targets.map((target) => (
        <Button
          key={target}
          size="sm"
          variant={finishStatuses.has(target) ? 'default' : 'outline'}
          onClick={() => go(target)}
          disabled={setStatus.isPending}
        >
          {target === 'finished' ? nextLabel[target] : target.replace('-', ' ')}
        </Button>
      ))}
    </div>
  );
}
