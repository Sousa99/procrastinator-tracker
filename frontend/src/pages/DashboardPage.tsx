import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTasks } from '../api/tasks';
import type { TaskFilters } from '../api/client';
import { TaskCreateForm } from '../components/task/TaskCreateForm';
import { TaskFilters as FilterBar } from '../components/task/TaskFilters';
import { TaskCard } from '../components/task/TaskCard';

export default function DashboardPage() {
  const [filters, setFilters] = useState<TaskFilters>({});
  const tasks = useTasks(filters);
  const [showForm, setShowForm] = useState(false);

  const active = tasks.data?.filter((t) => t.status !== 'finished') ?? [];
  const finished = tasks.data?.filter((t) => t.status === 'finished') ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 p-6 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">What are we tackling today?</h1>
        <p className="mt-1 text-sm text-slate-500">
          {active.length > 0
            ? `${active.length} ${active.length === 1 ? 'task' : 'tasks'} on the go. Small steps.`
            : 'Nothing pending — time to add your next win.'}
        </p>
        {active.length === 0 && <Sparkles className="mx-auto mt-3 size-6 text-amber-500" />}
      </section>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="w-full rounded-xl border border-dashed border-amber-300 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100/60"
      >
        {showForm ? 'Hide form' : '+ Add a task'}
      </button>
      {showForm && <TaskCreateForm onCreated={() => setShowForm(false)} />}

      <FilterBar filters={filters} onChange={setFilters} />

      {tasks.isLoading && <p className="text-sm text-slate-400">Loading tasks…</p>}
      {tasks.isError && (
        <p className="text-sm text-red-600">
          Could not load tasks: {tasks.error?.message ?? 'unknown error'}
        </p>
      )}

      {!tasks.isLoading && !tasks.isError && active.length === 0 && (
        <p className="rounded-xl bg-white/60 py-8 text-center text-sm text-slate-400">
          {filters.status || filters.tag
            ? 'No tasks match these filters.'
            : 'No active tasks. Add one above to get rolling.'}
        </p>
      )}

      <div className="space-y-3">
        {active.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {finished.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Done ({finished.length})
          </h2>
          <div className="space-y-3 opacity-70">
            {finished.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
