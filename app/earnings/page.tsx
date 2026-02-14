'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-3xl font-bold">Earnings</h1>
        <p className="mb-8 text-zinc-400">Track your earnings from approved contributions</p>

        {/* Balance Card */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-8">
          <div className="text-sm font-medium text-zinc-400">Total Earnings</div>
          <div className="mt-1 text-4xl font-bold text-green-400">${balance.toFixed(2)}</div>
          <p className="mt-2 text-sm text-zinc-500">
            You earn money when businesses approve your submissions
          </p>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Earning History</h2>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="mb-3 text-4xl">💰</div>
              <p className="text-zinc-400">No earnings yet.</p>
              <p className="mt-1 text-sm text-zinc-600">
                Submit training data and get it approved to start earning.
              </p>
              <a
                href="/userUpload"
                className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Start Contributing
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-sm text-green-400">
                      +
                    </div>
                    <div>
                      <div className="text-sm font-medium">{tx.description}</div>
                      {tx.createdAt?.seconds && (
                        <div className="text-xs text-zinc-600">
                          {new Date(tx.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-green-400">
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
