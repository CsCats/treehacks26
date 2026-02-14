'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  // --- SIGNED IN: show role-appropriate welcome ---
  if (user && profile) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-zinc-950 p-8 text-white">
        <div className="w-full max-w-3xl pt-8">
          <h1 className="mb-1 text-3xl font-bold">
            Welcome back, {profile.displayName || 'there'}
          </h1>
          <p className="mb-8 text-zinc-400">
            {profile.role === 'business'
              ? 'Manage your tasks and review submissions.'
              : 'Record motion data and contribute to robotics training.'}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {profile.role === 'contributor' && (
              <>
                <Link
                  href="/userUpload"
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-blue-500/50 hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold group-hover:text-blue-400">
                    Start Contributing
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Record yourself performing tasks. Our AI tracks your body movements in real-time.
                  </p>
                  <div className="mt-4 text-sm font-medium text-blue-400 group-hover:text-blue-300">
                    Open Camera →
                  </div>
                </Link>

                <Link
                  href="/contributions"
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-emerald-500/50 hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold group-hover:text-emerald-400">
                    View Past Contributions
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Track the approval status of your submitted training data.
                  </p>
                  <div className="mt-4 text-sm font-medium text-emerald-400 group-hover:text-emerald-300">
                    View History →
                  </div>
                </Link>
              </>
            )}

            {profile.role === 'contributor' && (
              <Link
                href="/earnings"
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-yellow-500/50 hover:bg-zinc-900/80"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-600/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h2 className="mb-2 text-xl font-semibold group-hover:text-yellow-400">
                  Earnings
                </h2>
                <p className="text-sm text-zinc-400">
                  View your balance and payout history from approved submissions.
                </p>
                <div className="mt-4 text-sm font-medium text-yellow-400 group-hover:text-yellow-300">
                  View Earnings →
                </div>
              </Link>
            )}

            {profile.role === 'business' && (
              <>
                <Link
                  href="/business"
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-purple-500/50 hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold group-hover:text-purple-400">
                    Open Dashboard
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Create tasks, review submissions, and download training datasets.
                  </p>
                  <div className="mt-4 text-sm font-medium text-purple-400 group-hover:text-purple-300">
                    Go to Dashboard →
                  </div>
                </Link>

                <Link
                  href="/billing"
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-yellow-500/50 hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-600/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold group-hover:text-yellow-400">
                    Billing
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Add funds to your account and view transaction history.
                  </p>
                  <div className="mt-4 text-sm font-medium text-yellow-400 group-hover:text-yellow-300">
                    Manage Billing →
                  </div>
                </Link>

                <Link
                  href="/developer"
                  className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-8 transition hover:border-cyan-500/50 hover:bg-zinc-900/80"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold group-hover:text-cyan-400">
                    Developer Integration
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Create API endpoints to programmatically access your training data.
                  </p>
                  <div className="mt-4 text-sm font-medium text-cyan-400 group-hover:text-cyan-300">
                    Manage APIs →
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- NOT SIGNED IN: landing page ---
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <main className="flex w-full max-w-3xl flex-col items-center px-8 py-16">
        <div className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-400">
          Crowdsourced Robotics Training
        </div>
        <h1 className="mb-4 text-center text-5xl font-bold leading-tight tracking-tight">
          Train Robots with
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Human Motion Data
          </span>
        </h1>
        <p className="mb-10 max-w-lg text-center text-lg text-zinc-400">
          Businesses post tasks. Users record themselves performing those tasks.
          Pose detection captures every movement. Robots learn from real humans.
        </p>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-zinc-700 px-8 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-white">17</div>
            <div className="text-xs text-zinc-500">Keypoints Tracked</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">3D</div>
            <div className="text-xs text-zinc-500">Skeleton Preview</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">JSON</div>
            <div className="text-xs text-zinc-500">Export Format</div>
          </div>
        </div>
      </main>
    </div>
  );
}
