'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/AuthContext';

const PoseSkeletonViewer = dynamic(() => import('@/components/PoseSkeletonViewer'), {
  ssr: false,
  loading: () => <div className="w-[400px] h-[300px] bg-zinc-900 rounded-lg animate-pulse" />,
});

interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string;
  businessId: string;
  businessName: string;
  pricePerApproval: number;
  deadline?: string | null;
  status?: 'open' | 'closed';
  submissionCount: number;
  createdAt?: { seconds: number };
}

interface Submission {
  id: string;
  taskId: string;
  contributorId?: string;
  contributorName?: string;
  status?: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  videoUrl: string;
  poseUrl: string;
  poseData: PoseFrame[];
  createdAt?: { seconds: number };
}

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

interface PoseFrame {
  timestamp: number;
  keypoints: Keypoint[];
}

type View = 'tasks' | 'submissions';

export default function BusinessDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [view, setView] = useState<View>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  // Reject feedback
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Create task form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'business')) {
      router.push('/');
      return;
    }
    if (user && profile?.role === 'business') {
      fetchTasks();
    }
  }, [user, profile, authLoading]);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/tasks?businessId=${user.uid}`);
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) return;
    setCreating(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          requirements: newRequirements,
          pricePerApproval: parseFloat(newPrice) || 0,
          deadline: newDeadline || null,
          businessId: user!.uid,
          businessName: profile?.displayName || '',
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewDescription('');
        setNewRequirements('');
        setNewPrice('');
        setNewDeadline('');
        setShowCreateForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreating(false);
    }
  };

  const viewSubmissions = async (task: Task) => {
    setSelectedTask(task);
    setView('submissions');
    setLoadingSubmissions(true);

    try {
      const res = await fetch(`/api/submissions?taskId=${task.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setSubmissions(data);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: 'approved' | 'rejected', feedback?: string) => {
    try {
      const res = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, status, feedback: feedback || undefined }),
      });
      if (res.ok) {
        setSubmissions(prev =>
          prev.map(s => (s.id === submissionId ? { ...s, status, feedback: feedback || s.feedback } : s))
        );
        if (status === 'approved') {
          await refreshProfile();
        }
        setRejectingId(null);
        setRejectFeedback('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update submission');
      }
    } catch (err) {
      console.error('Failed to update submission status:', err);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'closed' ? 'open' : 'closed';
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });
      if (res.ok) {
        setTasks(prev =>
          prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const downloadAllData = async () => {
    if (!selectedTask || submissions.length === 0) return;

    // Create a JSON file with all submission data
    const exportData = submissions.map(sub => ({
      id: sub.id,
      videoUrl: sub.videoUrl,
      poseUrl: sub.poseUrl,
      poseData: sub.poseData,
      createdAt: sub.createdAt,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTask.title.replace(/\s+/g, '_')}_submissions.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- SUBMISSIONS VIEW ---
  if (view === 'submissions' && selectedTask) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => { setView('tasks'); setSelectedTask(null); setSubmissions([]); }}
            className="mb-6 text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Back to Tasks
          </button>

          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{selectedTask.title}</h1>
              <p className="mt-1 text-zinc-400">{selectedTask.description}</p>
              {selectedTask.requirements && (
                <p className="mt-1 text-sm text-zinc-500">
                  Requirements: {selectedTask.requirements}
                </p>
              )}
            </div>
            <button
              onClick={downloadAllData}
              disabled={submissions.length === 0}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Download All Data ({submissions.length})
            </button>
          </div>

          {loadingSubmissions ? (
            <div className="text-zinc-500">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
              No submissions yet. Share this task with users to start collecting data.
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub, index) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)
                    }
                    className="flex w-full cursor-pointer items-center justify-between p-4 text-left hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Submission #{index + 1}</span>
                      {sub.contributorName && (
                        <span className="rounded-full bg-blue-600/20 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                          {sub.contributorName}
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        sub.status === 'approved'
                          ? 'bg-green-500/10 text-green-400'
                          : sub.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          sub.status === 'approved'
                            ? 'bg-green-400'
                            : sub.status === 'rejected'
                            ? 'bg-red-400'
                            : 'bg-yellow-400'
                        }`} />
                        {sub.status === 'approved' ? 'Approved' : sub.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {sub.poseData?.length || 0} pose frames
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(!sub.status || sub.status === 'pending') && rejectingId !== sub.id && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); updateSubmissionStatus(sub.id, 'approved'); }}
                            className="rounded bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30"
                          >
                            Approve
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setRejectingId(sub.id); setRejectFeedback(''); }}
                            className="rounded bg-red-600/20 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {sub.status === 'rejected' && sub.feedback && (
                        <span className="text-xs text-zinc-500 italic max-w-[200px] truncate" title={sub.feedback}>
                          &quot;{sub.feedback}&quot;
                        </span>
                      )}
                      <a
                        href={sub.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="rounded bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
                      >
                        Download Video
                      </a>
                      <a
                        href={sub.poseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="rounded bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
                      >
                        Download JSON
                      </a>
                      <span className="text-zinc-500">
                        {expandedSubmission === sub.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Reject feedback input */}
                  {rejectingId === sub.id && (
                    <div className="flex items-center gap-2 border-t border-zinc-800 px-4 py-3 bg-zinc-900/50" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={rejectFeedback}
                        onChange={e => setRejectFeedback(e.target.value)}
                        placeholder="Add feedback (e.g., lighting too dark, please resubmit)..."
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateSubmissionStatus(sub.id, 'rejected', rejectFeedback);
                          if (e.key === 'Escape') { setRejectingId(null); setRejectFeedback(''); }
                        }}
                      />
                      <button
                        onClick={() => updateSubmissionStatus(sub.id, 'rejected', rejectFeedback)}
                        className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectFeedback(''); }}
                        className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {expandedSubmission === sub.id && (
                    <div className="border-t border-zinc-800 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex-1">
                          <h4 className="mb-2 text-sm font-medium text-zinc-400">Video</h4>
                          <video
                            src={sub.videoUrl}
                            controls
                            className="w-full max-w-lg rounded-lg bg-black"
                          />
                        </div>
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-zinc-400">
                            3D Pose Preview
                          </h4>
                          <PoseSkeletonViewer
                            keypoints={
                              sub.poseData && sub.poseData.length > 0
                                ? sub.poseData[Math.floor(sub.poseData.length / 2)].keypoints
                                : []
                            }
                            width={400}
                            height={300}
                          />
                          <p className="mt-1 text-xs text-zinc-600">
                            Drag to rotate • Scroll to zoom
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TASKS LIST VIEW ---
  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-300">
          ← Back to Home
        </a>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Business Dashboard</h1>
            <p className="mt-1 text-zinc-400">
              Create tasks and manage crowdsourced training data
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : '+ New Task'}
          </button>
        </div>

        {/* Create Task Form */}
        {showCreateForm && (
          <form
            onSubmit={createTask}
            className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
          >
            <h2 className="mb-4 text-lg font-semibold">Create New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Pick up a cup from a table"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Describe the task the user should perform in detail..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Requirements (optional)
                </label>
                <textarea
                  value={newRequirements}
                  onChange={e => setNewRequirements(e.target.value)}
                  placeholder="e.g., Must be filmed from front angle, full body visible, well-lit environment..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Price per Approved Video ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    placeholder="5.00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-7 pr-4 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-600">Amount paid to contributor per approved submission</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-400">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-zinc-600">Task will auto-show as expired after this date</p>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-500">
            No tasks yet. Create your first task to start collecting training data.
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map(task => (
              <div
                key={task.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      {task.pricePerApproval > 0 && (
                        <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          ${task.pricePerApproval.toFixed(2)}/video
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        task.status === 'closed'
                          ? 'bg-red-500/10 text-red-400'
                          : task.deadline && new Date(task.deadline) < new Date()
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {task.status === 'closed'
                          ? 'Closed'
                          : task.deadline && new Date(task.deadline) < new Date()
                          ? 'Expired'
                          : 'Open'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{task.description}</p>
                    {task.requirements && (
                      <p className="mt-2 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-400">Requirements:</span>{' '}
                        {task.requirements}
                      </p>
                    )}
                    {task.deadline && (
                      <p className="mt-1 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-400">Deadline:</span>{' '}
                        {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2">
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                      {task.submissionCount || 0} submissions
                    </span>
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status || 'open')}
                      className={`rounded-lg px-4 py-1.5 text-xs font-medium ${
                        task.status === 'closed'
                          ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                          : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                      }`}
                    >
                      {task.status === 'closed' ? 'Reopen' : 'Close Task'}
                    </button>
                    <button
                      onClick={() => viewSubmissions(task)}
                      className="rounded-lg bg-zinc-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-600"
                    >
                      View Submissions
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
