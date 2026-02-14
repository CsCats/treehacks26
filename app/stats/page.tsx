'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

interface Overview {
  totalTasks: number;
  totalSubmissions: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalPaidOut: number;
  uniqueContributors: number;
}

interface Contributor {
  contributorId: string;
  contributorName: string;
  totalSubmissions: number;
  approved: number;
  pending: number;
  rejected: number;
  totalEarned: number;
}

interface TaskStat {
  taskId: string;
  title: string;
  pricePerApproval: number;
  totalSubmissions: number;
  approved: number;
  pending: number;
  rejected: number;
  totalPaid: number;
}

export default function StatsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [topContributors, setTopContributors] = useState<Contributor[]>([]);
  const [topEarners, setTopEarners] = useState<Contributor[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contributors' | 'earners' | 'tasks'>('contributors');

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'business')) {
      router.push('/');
      return;
    }
    if (user && profile?.role === 'business') {
      fetchStats();
    }
  }, [user, profile, authLoading]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?businessId=${user.uid}`);
      const data = await res.json();
      setOverview(data.overview || null);
      setTopContributors(data.topContributors || []);
      setTopEarners(data.topEarners || []);
      setTaskStats(data.taskStats || []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
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
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-3xl font-bold">Stats</h1>
        <p className="mb-8 text-zinc-400">Analytics and leaderboards for your tasks</p>

        {/* Overview Cards */}
        {overview && (
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl font-bold">{overview.totalSubmissions}</div>
              <div className="mt-1 text-xs text-zinc-500">Total Submissions</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl font-bold text-green-400">{overview.totalApproved}</div>
              <div className="mt-1 text-xs text-zinc-500">Approved</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl font-bold text-yellow-400">{overview.totalPending}</div>
              <div className="mt-1 text-xs text-zinc-500">Pending</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl font-bold text-red-400">{overview.totalRejected}</div>
              <div className="mt-1 text-xs text-zinc-500">Rejected</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl font-bold">{overview.totalTasks}</div>
              <div className="mt-1 text-xs text-zinc-500">Tasks</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl font-bold text-blue-400">{overview.uniqueContributors}</div>
              <div className="mt-1 text-xs text-zinc-500">Contributors</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 md:col-span-2">
              <div className="text-2xl font-bold text-emerald-400">${overview.totalPaidOut.toFixed(2)}</div>
              <div className="mt-1 text-xs text-zinc-500">Total Paid Out</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
          {[
            { key: 'contributors' as const, label: 'Top Contributors' },
            { key: 'earners' as const, label: 'Top Earners' },
            { key: 'tasks' as const, label: 'Task Breakdown' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top Contributors */}
        {activeTab === 'contributors' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {topContributors.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No contributors yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Contributor</th>
                    <th className="px-5 py-3 font-medium text-right">Submissions</th>
                    <th className="px-5 py-3 font-medium text-right">Approved</th>
                    <th className="px-5 py-3 font-medium text-right">Pending</th>
                    <th className="px-5 py-3 font-medium text-right">Approval Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topContributors.map((c, i) => {
                    const rate = c.totalSubmissions > 0
                      ? ((c.approved / c.totalSubmissions) * 100).toFixed(0)
                      : '0';
                    return (
                      <tr key={c.contributorId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-5 py-3">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                            i === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'text-zinc-600'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">{c.contributorName}</td>
                        <td className="px-5 py-3 text-right text-zinc-400">{c.totalSubmissions}</td>
                        <td className="px-5 py-3 text-right text-green-400">{c.approved}</td>
                        <td className="px-5 py-3 text-right text-yellow-400">{c.pending}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            Number(rate) >= 80 ? 'bg-green-500/10 text-green-400' :
                            Number(rate) >= 50 ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Top Earners */}
        {activeTab === 'earners' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {topEarners.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No earners yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Contributor</th>
                    <th className="px-5 py-3 font-medium text-right">Approved</th>
                    <th className="px-5 py-3 font-medium text-right">Total Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {topEarners.filter(c => c.totalEarned > 0).map((c, i) => (
                    <tr key={c.contributorId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-5 py-3">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                          i === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'text-zinc-600'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium">{c.contributorName}</td>
                      <td className="px-5 py-3 text-right text-green-400">{c.approved}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-emerald-400">${c.totalEarned.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                  {topEarners.filter(c => c.totalEarned > 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                        No earnings recorded yet. Approve submissions with a price to see earners.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Task Breakdown */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {taskStats.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
                No tasks yet
              </div>
            ) : (
              taskStats.map(t => {
                const total = t.totalSubmissions || 1;
                const approvedPct = (t.approved / total) * 100;
                const pendingPct = (t.pending / total) * 100;
                const rejectedPct = (t.rejected / total) * 100;
                return (
                  <div key={t.taskId} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{t.title}</h3>
                          {t.pricePerApproval > 0 && (
                            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                              ${t.pricePerApproval.toFixed(2)}/video
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {t.totalSubmissions} submission{t.totalSubmissions !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {t.totalPaid > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-400">${t.totalPaid.toFixed(2)}</div>
                          <div className="text-xs text-zinc-600">paid out</div>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {t.totalSubmissions > 0 && (
                      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                        {t.approved > 0 && (
                          <div className="bg-green-500" style={{ width: `${approvedPct}%` }} />
                        )}
                        {t.pending > 0 && (
                          <div className="bg-yellow-500" style={{ width: `${pendingPct}%` }} />
                        )}
                        {t.rejected > 0 && (
                          <div className="bg-red-500" style={{ width: `${rejectedPct}%` }} />
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex gap-4 text-xs">
                      <span className="text-green-400">{t.approved} approved</span>
                      <span className="text-yellow-400">{t.pending} pending</span>
                      <span className="text-red-400">{t.rejected} rejected</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
