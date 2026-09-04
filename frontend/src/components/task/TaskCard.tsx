import { Link } from 'react-router';
import { MapPin, Flame, CalendarDays } from 'lucide-react';
import type { Task } from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge, StatusBadge } from '../ui/badge';
import { cn } from '../../lib/utils';

export function TaskCard({ task }: { task: Task }) {
  const isUrgent = task.urgency !== null && task.urgency >= 4;
  return (
    <Link to={`/tasks/${task.id}`} className="block">
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
    </Link>
  );
}
