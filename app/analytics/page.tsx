'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  submissionCount: number;
  status: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTasks(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch tasks:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/businessView" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4 inline-block">
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
            Data Analytics
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Analyze your motion capture data and train ML models
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Total Tasks
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
              {tasks.length}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Total Submissions
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
              {tasks.reduce((sum, t) => sum + t.submissionCount, 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Active Tasks
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
              {tasks.filter(t => t.status === 'open').length}
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Your Tasks
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                No tasks yet. Create a task to start collecting data!
              </p>
              <button
                onClick={() => router.push('/businessView')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Task
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tasks.map(task => (
                <div key={task.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>{task.submissionCount} submissions</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'open'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/notebook?task=${encodeURIComponent(task.title)}&taskId=${task.id}`)}
                      disabled={task.submissionCount === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <span>📊</span>
                      Analyze Data
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="mt-8 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800/30 p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                About Data Analysis
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Click "Analyze Data" on any task to open an interactive notebook with:
              </p>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 ml-4">
                <li>• View submission statistics and pose data</li>
                <li>• Visualize movement patterns over time</li>
                <li>• Export data for ML training</li>
                <li>• Download as CSV or JSON</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
