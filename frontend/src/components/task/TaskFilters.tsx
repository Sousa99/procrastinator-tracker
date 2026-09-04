import { useTags } from '../../api/meta';
import type { TaskFilters, TaskStatus } from '../../api/client';
import { Select } from '../ui/input';

const STATUS_OPTIONS: Array<{ value: TaskStatus | ''; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'to-start', label: 'To-start' },
  { value: 'started', label: 'Started' },
  { value: 'in-progress', label: 'In-progress' },
  { value: 'on-hold', label: 'On-hold' },
  { value: 'validating', label: 'Validating' },
  { value: 'finished', label: 'Finished' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'Any urgency' },
  { value: 'high', label: 'High (4–5)' },
  { value: 'low', label: 'Low (1–2)' },
  { value: 'none', label: 'Unset' },
];

interface TaskFiltersProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
}

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const tags = useTags();

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Select
        aria-label="Status filter"
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({ ...filters, status: (e.target.value || undefined) as TaskStatus | undefined })
        }
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Tag filter"
        value={filters.tag ?? ''}
        onChange={(e) => onChange({ ...filters, tag: e.target.value || undefined })}
      >
        <option value="">Any tag</option>
        {tags.data?.map((t) => (
          <option key={t.id} value={t.name}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Urgency filter"
        value={filters.urgency ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            urgency: (e.target.value || undefined) as TaskFilters['urgency'],
          })
        }
      >
        {URGENCY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
