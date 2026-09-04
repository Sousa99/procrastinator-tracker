import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useAddComment } from '../../api/tasks';
import type { Comment } from '../../api/client';
import { Button } from '../ui/button';
import { Textarea } from '../ui/input';
import { Badge } from '../ui/badge';

interface TaskCommentsProps {
  taskId: number;
  comments: Comment[];
}

export function TaskComments({ taskId, comments }: TaskCommentsProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const addComment = useAddComment();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addComment.mutateAsync({ id: taskId, body });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
  }

  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <Badge>{c.status}</Badge>
                <span className="text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-700">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" size="sm" disabled={addComment.isPending}>
          <MessageSquarePlus className="size-4" />
          Add comment
        </Button>
      </form>
    </div>
  );
}
