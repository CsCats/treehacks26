'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

interface Submission {
  id: string;
  taskId: string;
  businessName?: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  rating?: number;
  videoUrl: string;
  poseUrl: string;
  createdAt?: { seconds: number };
  taskTitle?: string;
}

interface Task {
  id: string;
  title: string;
  businessName: string;
}

export default function ContributionsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'contributor')) {
      router.push('/');
      return;
    }
    if (user && profile?.role === 'contributor') {
      fetchData();
    }
  }, [user, profile, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch submissions and tasks in parallel
      const [subsRes, tasksRes] = await Promise.all([
        fetch(`/api/submissions?contributorId=${user.uid}`),
        fetch('/api/tasks'),
      ]);

      const subsData = await subsRes.json();
      const tasksData = await tasksRes.json();

      // Build task lookup map
      const taskMap: Record<string, Task> = {};
      if (Array.isArray(tasksData)) {
        tasksData.forEach((t: Task) => {
          taskMap[t.id] = t;
        });
      }
      setTasks(taskMap);

      if (Array.isArray(subsData)) {
        setSubmissions(subsData);
      }
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: {
      label: 'Pending Approval',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      dot: 'bg-yellow-400',
    },
    approved: {
      label: 'Approved',
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      dot: 'bg-green-400',
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 text-zinc-900 dark:text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">My contributions</h1>
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">
          Track the status of your submitted training data
        </p>

        {submissions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl dark:bg-zinc-800/80">
              📭
            </div>
            <p className="text-zinc-700 dark:text-zinc-300">No contributions yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Record a task to submit your first contribution.
            </p>
            <Link
              href="/userUpload"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-blue-500"
            >
              Start contributing
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const task = tasks[sub.taskId];
              const status = statusConfig[sub.status] || statusConfig.pending;

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold truncate text-zinc-900 dark:text-white">
                        {task?.title || 'Unknown Task'}
                      </h3>
                      {task?.businessName && (
                        <span className="shrink-0 rounded-full bg-purple-600/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                          {task.businessName}
                        </span>
                      )}
                    </div>
                    {sub.createdAt?.seconds && (
                      <p className="mt-1 text-xs text-zinc-600">
                        Submitted {new Date(sub.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {sub.status === 'rejected' && sub.feedback && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                        <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="text-xs text-red-300">{sub.feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-3">
                    {sub.rating && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg
                            key={star}
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={star <= sub.rating! ? '#eab308' : 'none'}
                            stroke={star <= sub.rating! ? '#eab308' : '#52525b'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <a
                      href={sub.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                    >
                      View Video
                    </a>
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
