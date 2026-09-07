import type { ReactNode } from 'react';
import { CalendarDays, Flame, MapPin } from 'lucide-react';
import type { Task, TaskFilters } from '../../api/client';
import { Badge, StatusBadge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { Deck, DeckCards, DeckItem } from '../ui/deck/deck';

export interface TaskDeckProps {
  tasks: Task[];
  filters?: TaskFilters;
  autoRotateMs?: number;
  loop?: boolean;
  stackSize?: number;
  slideDurationMs?: number;
  renderCard?: (task: Task) => ReactNode;
  onCardChange?: (index: number) => void;
  className?: string;
}

const EMPTY_FILTERS: TaskFilters = {};

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

export function TaskDeckCard({ task }: { task: Task }) {
  const isUrgent = task.urgency !== null && task.urgency >= 4;
  return (
    <Card
      className={cn(
        'flex h-full w-full flex-col overflow-hidden transition hover:border-amber-400',
        isUrgent && 'border-amber-400/80',
      )}
    >
      <CardHeader>
        <CardTitle className="flex-1">{task.title}</CardTitle>
        <StatusBadge status={task.status} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {task.description && (
          <p className="line-clamp-6 min-h-0 flex-1 overflow-hidden text-slate-600">
            {task.description}
          </p>
        )}
        <div className="mt-auto space-y-2">
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
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskDeck({
  tasks,
  filters = EMPTY_FILTERS,
  autoRotateMs = 4000,
  loop = true,
  stackSize = 3,
  slideDurationMs = 500,
  renderCard,
  onCardChange,
  className,
}: TaskDeckProps) {
  const render = renderCard ?? ((task: Task) => <TaskDeckCard task={task} />);
  const visible = tasks.filter((task) => matchesFilters(task, filters)).sort(sortByUrgency);

  if (visible.length === 0) return null;

  return (
    <Deck className={cn('h-[24rem] w-full sm:h-[26rem]', className)}>
      <DeckCards
        autoRotateMs={autoRotateMs}
        loop={loop}
        onCurrentIndexChange={onCardChange}
        slideDurationMs={slideDurationMs}
        stackSize={stackSize}
      >
        {visible.map((task) => (
          <DeckItem className="p-0" data-testid="task-deck-card" key={task.id}>
            {render(task)}
          </DeckItem>
        ))}
      </DeckCards>
    </Deck>
  );
}
