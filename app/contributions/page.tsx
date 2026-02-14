'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

interface Submission {
  id: string;
  taskId: string;
  businessName?: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-3xl font-bold">My Contributions</h1>
        <p className="mb-8 text-zinc-400">
          Track the status of your submitted training data
        </p>

        {submissions.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <div className="mb-3 text-4xl">📭</div>
            <p className="text-zinc-400">No contributions yet.</p>
            <a
              href="/userUpload"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start Contributing
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const task = tasks[sub.taskId];
              const status = statusConfig[sub.status] || statusConfig.pending;

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold truncate">
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
