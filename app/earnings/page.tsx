'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

interface Transaction {
  id: string;
  type: 'earning';
  amount: number;
  description: string;
  createdAt?: { seconds: number };
}

export default function EarningsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'contributor')) {
      router.push('/');
      return;
    }
    if (user && profile?.role === 'contributor') {
      fetchEarnings();
    }
  }, [user, profile, authLoading]);

  const fetchEarnings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/billing?userId=${user.uid}`);
      const data = await res.json();
      setBalance(data.balance || 0);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    } finally {
      setLoading(false);
    }
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
        <h1 className="mb-1 text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">
          Track your earnings from approved contributions
        </p>

        {/* Balance Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/10">
          <div className="border-b border-zinc-200 bg-gradient-to-br from-emerald-500/10 to-transparent p-8 dark:border-zinc-800/80">
            <div className="text-sm font-medium uppercase tracking-wider text-zinc-500">
              Total earnings
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              ${balance.toFixed(2)}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              You earn when businesses approve your submissions
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-200">Earning history</h2>
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl dark:bg-zinc-800/80">
                💰
              </div>
              <p className="text-zinc-700 dark:text-zinc-300">No earnings yet</p>
              <p className="mt-1 text-sm text-zinc-500">
                Submit training data and get it approved to start earning.
              </p>
              <Link
                href="/userUpload"
                className="btn-primary mt-6 group/btn"
              >
                Start contributing
                <svg className="transition-transform duration-200 group-hover/btn:translate-x-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:shadow-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      +
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{tx.description}</div>
                      {tx.createdAt?.seconds && (
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {new Date(tx.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    +${Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
