'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

interface ProfileData {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  balance: number;
  createdAt: string;
}

interface ContributorStats {
  totalSubmissions: number;
  approved: number;
  pending: number;
  rejected: number;
  approvalRate: number;
  uniqueTasks: number;
  uniqueBusinesses: number;
  totalEarned: number;
}

interface BusinessStats {
  totalTasks: number;
  totalSubmissions: number;
  approved: number;
  pending: number;
  rejected: number;
  uniqueContributors: number;
  totalPaidOut: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading, refreshProfile } = useAuth();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ContributorStats | BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?userId=${user.uid}`);
      const data = await res.json();
      setProfileData(data.profile || null);
      setStats(data.stats || null);
      if (data.profile) {
        setEditName(data.profile.displayName || '');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, displayName: editName }),
      });
      if (res.ok) {
        setEditing(false);
        await refreshProfile();
        fetchProfile();
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  if (!profileData) return null;

  const isContributor = profileData.role === 'contributor';
  const cStats = stats as ContributorStats;
  const bStats = stats as BusinessStats;

  const memberSince = profileData.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="min-h-screen p-8 text-zinc-900 dark:text-white">
      <div className="mx-auto max-w-3xl">
        {/* Profile Header */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold">
              {(profileData.displayName || profileData.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-lg font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving || !editName.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditName(profileData.displayName || '');
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profileData.displayName || 'No name set'}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400 transition"
                    title="Edit name"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="mt-1 text-sm text-zinc-500">{profileData.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isContributor
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-purple-500/10 text-purple-400'
                }`}>
                  {profileData.role}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-600">Member since {memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-zinc-500">
                {isContributor ? 'Earnings Balance' : 'Account Balance'}
              </div>
              <div className={`mt-1 text-3xl font-bold ${isContributor ? 'text-green-500 dark:text-green-400' : 'text-zinc-900 dark:text-white'}`}>
                ${profileData.balance.toFixed(2)}
              </div>
            </div>
            <a
              href={isContributor ? '/earnings' : '/billing'}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white transition"
            >
              {isContributor ? 'View Earnings' : 'Manage Billing'}
            </a>
          </div>
        </div>

        {/* Stats */}
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Your Stats</h2>

        {isContributor && cStats && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold">{cStats.totalSubmissions}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Submissions</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-green-500 dark:text-green-400">{cStats.approved}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Approved</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{cStats.pending}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Pending</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-red-500 dark:text-red-400">{cStats.rejected}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Rejected</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold">
                  <span className={`${
                    cStats.approvalRate >= 80 ? 'text-green-500 dark:text-green-400' :
                    cStats.approvalRate >= 50 ? 'text-yellow-500 dark:text-yellow-400' :
                    'text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {cStats.approvalRate}%
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">Approval Rate</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{cStats.uniqueTasks}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Tasks Contributed To</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">{cStats.uniqueBusinesses}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Businesses Worked With</div>
              </div>
            </div>

            {/* Approval progress bar */}
            {cStats.totalSubmissions > 0 && (
              <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Submission Breakdown</div>
                <div className="flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  {cStats.approved > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(cStats.approved / cStats.totalSubmissions) * 100}%` }}
                    />
                  )}
                  {cStats.pending > 0 && (
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${(cStats.pending / cStats.totalSubmissions) * 100}%` }}
                    />
                  )}
                  {cStats.rejected > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(cStats.rejected / cStats.totalSubmissions) * 100}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Approved ({cStats.approved})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending ({cStats.pending})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Rejected ({cStats.rejected})
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {!isContributor && bStats && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold">{bStats.totalTasks}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Tasks Created</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold">{bStats.totalSubmissions}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Total Submissions</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-green-500 dark:text-green-400">{bStats.approved}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Approved</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{bStats.uniqueContributors}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Contributors</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{bStats.pending}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Pending Review</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">${bStats.totalPaidOut.toFixed(2)}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Total Paid Out</div>
              </div>
            </div>

            {bStats.totalSubmissions > 0 && (
              <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Submission Breakdown</div>
                <div className="flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  {bStats.approved > 0 && (
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(bStats.approved / bStats.totalSubmissions) * 100}%` }}
                    />
                  )}
                  {bStats.pending > 0 && (
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${(bStats.pending / bStats.totalSubmissions) * 100}%` }}
                    />
                  )}
                  {bStats.rejected > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(bStats.rejected / bStats.totalSubmissions) * 100}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Approved ({bStats.approved})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" /> Pending ({bStats.pending})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Rejected ({bStats.rejected})
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Account Details */}
        <h2 className="mb-4 mt-8 text-lg font-semibold text-zinc-900 dark:text-white">Account Details</h2>
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800/50">
            <span className="text-sm text-zinc-500">User ID</span>
            <code className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">{profileData.uid}</code>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800/50">
            <span className="text-sm text-zinc-500">Email</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{profileData.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800/50">
            <span className="text-sm text-zinc-500">Role</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isContributor ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
            }`}>
              {profileData.role}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-zinc-500">Member Since</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{memberSince}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
