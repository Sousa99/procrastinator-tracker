import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import type { TaskStatus } from '../../api/client';

const statusStyles: Record<TaskStatus, string> = {
  'to-start': 'bg-slate-100 text-slate-600',
  started: 'bg-sky-100 text-sky-700',
  'in-progress': 'bg-amber-100 text-amber-800',
  'on-hold': 'bg-orange-100 text-orange-700',
  validating: 'bg-violet-100 text-violet-700',
  finished: 'bg-emerald-100 text-emerald-700',
};

const labels: Record<TaskStatus, string> = {
  'to-start': 'to-start',
  started: 'started',
  'in-progress': 'in-progress',
  'on-hold': 'on-hold',
  validating: 'validating',
  finished: 'finished',
};

export function StatusBadge({
  status,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className,
      )}
      {...props}
    >
      {labels[status]}
    </span>
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600',
        className,
      )}
      {...props}
    />
  );
}
