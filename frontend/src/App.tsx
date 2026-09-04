import { Link, Route, Routes } from 'react-router';
import { ListTodo } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import TaskDetailPage from './pages/TaskDetailPage';

export default function App() {
  return (
    <div className="min-h-screen bg-amber-50/60 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-amber-200/70 bg-amber-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-700">
            <ListTodo className="size-5 text-amber-600" />
            Procrastinator Tracker
          </Link>
          <span className="ml-auto text-xs text-slate-400">small steps, big progress</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
