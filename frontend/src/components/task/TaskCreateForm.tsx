import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateTask } from '../../api/tasks';
import { useUsers } from '../../api/meta';
import type { RecurrenceFrequency } from '../../api/client';
import { Button } from '../ui/button';
import { Input, Label, Select, Textarea } from '../ui/input';

interface TaskCreateFormProps {
  onCreated?: () => void;
}

export function TaskCreateForm({ onCreated }: TaskCreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState('');
  const [tags, setTags] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [frequency, setFrequency] = useState<'none' | RecurrenceFrequency>('none');
  const [interval, setInterval] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const createTask = useCreateTask();
  const users = useUsers();

  function toggleAssignee(id: number) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createTask.mutateAsync({
        title,
        description: description || undefined,
        location: location || undefined,
        urgency: urgency ? Number(urgency) : undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
        recurrence:
          frequency === 'none' ? undefined : { frequency, interval: Number(interval) || 1 },
      });
      setTitle('');
      setDescription('');
      setLocation('');
      setUrgency('');
      setTags('');
      setAssigneeIds([]);
      setFrequency('none');
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-dashed border-amber-300 bg-white/70 p-4"
    >
      <div>
        <Label htmlFor="task-title">Task</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          required
        />
      </div>
      <div>
        <Label htmlFor="task-desc">Notes (optional)</Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="task-location">Location</Label>
          <Input
            id="task-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Home, office…"
          />
        </div>
        <div>
          <Label htmlFor="task-urgency">Urgency (1–5)</Label>
          <Select id="task-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="">None</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="task-tags">Tags (comma separated)</Label>
          <Input
            id="task-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="chores, work"
          />
        </div>
        <div>
          <Label htmlFor="task-freq">Recurring</Label>
          <Select
            id="task-freq"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'none' | RecurrenceFrequency)}
          >
            <option value="none">Not recurring</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </div>
      </div>
      {frequency !== 'none' && (
        <div>
          <Label htmlFor="task-interval">Every (interval)</Label>
          <Input
            id="task-interval"
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-24"
          />
        </div>
      )}
      {users.data && users.data.length > 0 && (
        <div>
          <Label>Assign to</Label>
          <div className="flex flex-wrap gap-2">
            {users.data.map((u) => {
              const active = assigneeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={
                    'rounded-full border px-3 py-1 text-xs ' +
                    (active
                      ? 'border-amber-500 bg-amber-100 text-amber-800'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')
                  }
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={createTask.isPending} className="w-full">
        <Plus className="size-4" />
        Add task
      </Button>
    </form>
  );
}
