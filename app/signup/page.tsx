'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, UserRole } from '@/lib/AuthContext';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError('Please select an account type');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, role, displayName);
      router.push(role === 'contributor' ? '/userUpload' : '/business');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.1),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_20%_60%,rgba(59,130,246,0.05),transparent)] dark:bg-[radial-gradient(ellipse_50%_60%_at_20%_60%,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative w-full max-w-md px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:shadow-2xl dark:shadow-black/20">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Join the robotics training platform</p>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-zinc-600 dark:text-zinc-300">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('contributor')}
                className={`rounded-xl border p-4 text-left transition ${
                  role === 'contributor'
                    ? 'border-blue-500 bg-blue-500/15 shadow-lg shadow-blue-500/10'
                    : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600'
                }`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={role === 'contributor' ? '#3b82f6' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div className={`text-sm font-semibold ${role === 'contributor' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>
                  Contributor
                </div>
                <div className="mt-1 text-xs text-zinc-500">Record motion data & earn</div>
              </button>

              <button
                type="button"
                onClick={() => setRole('business')}
                className={`rounded-xl border p-4 text-left transition ${
                  role === 'business'
                    ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                    : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600'
                }`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={role === 'business' ? '#a855f7' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div className={`text-sm font-semibold ${role === 'business' ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-900 dark:text-white'}`}>
                  Business
                </div>
                <div className="mt-1 text-xs text-zinc-500">Create tasks & collect data</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {role === 'business' ? 'Company name' : 'Display name'}
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-400 transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder-zinc-500"
                placeholder={role === 'business' ? 'Acme Robotics' : 'John Doe'}
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-400 transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder-zinc-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-400 transition focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder-zinc-500"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !role}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-400 hover:to-purple-500 hover:shadow-blue-500/30 disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
