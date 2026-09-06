import type { ReactNode } from 'react';
import { CalendarDays, Flame, MapPin } from 'lucide-react';
import type { Task, TaskFilters } from '../../api/client';
import { Badge, StatusBadge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

export interface TaskStackProps {
  tasks: Task[];
  filters?: TaskFilters;
  renderCard?: (task: Task) => ReactNode;
  maxVisible?: number;
  className?: string;
}

function matchesFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.status !== undefined && task.status !== filters.status) return false;
  if (filters.tag !== undefined && !task.tags.includes(filters.tag)) return false;
  if (filters.assignee !== undefined && !task.assignees.some((a) => a.id === filters.assignee)) {
    return false;
  }
  if (filters.urgency === 'high' && !(task.urgency !== null && task.urgency >= 4)) return false;
  if (filters.urgency === 'low' && !(task.urgency !== null && task.urgency <= 2)) return false;
  if (filters.urgency === 'none' && task.urgency !== null) return false;
  if (filters.location !== undefined && task.location !== filters.location) return false;
  if (filters.finished !== undefined && (task.status === 'finished') !== filters.finished) {
    return false;
  }
  if (filters.recurring !== undefined && (task.recurrence !== null) !== filters.recurring) {
    return false;
  }
  return true;
}

function sortByUrgency(a: Task, b: Task): number {
  if (a.urgency === null && b.urgency === null) return 0;
  if (a.urgency === null) return 1;
  if (b.urgency === null) return -1;
  return b.urgency - a.urgency;
}

export function TaskStackCard({ task }: { task: Task }) {
  const isUrgent = task.urgency !== null && task.urgency >= 4;
  return (
    <Card className={cn('transition hover:border-amber-400', isUrgent && 'border-amber-400/80')}>
      <CardHeader>
        <CardTitle className="flex-1">{task.title}</CardTitle>
        <StatusBadge status={task.status} />
      </CardHeader>
      <CardContent className="space-y-2">
        {task.description && <p className="line-clamp-2 text-slate-600">{task.description}</p>}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {task.urgency !== null && (
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3.5 text-amber-500" />
              {task.urgency}
            </span>
          )}
          {task.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {task.location}
            </span>
          )}
          {task.dueDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
        {task.assignees.length > 0 && (
          <div className="text-xs text-slate-500">
            {task.assignees.map((a) => a.name).join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TaskStack({
  tasks,
  filters = {},
  renderCard,
  maxVisible,
  className,
}: TaskStackProps) {
  const render = renderCard ?? ((task: Task) => <TaskStackCard key={task.id} task={task} />);
  const visible = tasks
    .filter((task) => matchesFilters(task, filters))
    .sort(sortByUrgency)
    .slice(0, maxVisible);

  return (
    <div className={cn('relative flex flex-col', className)}>
      {visible.map((task, index) => (
        <div
          key={task.id}
          data-testid="task-stack-item"
          className={cn(index > 0 && 'task-stack-overlap -mt-24')}
          style={{ zIndex: visible.length - index }}
        >
          {render(task)}
        </div>
      ))}
    </div>
  );
}
