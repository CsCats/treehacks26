'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

interface Transaction {
  id: string;
  type: 'deposit' | 'payout';
  amount: number;
  description: string;
  createdAt?: { seconds: number };
}

export default function BillingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'business')) {
      router.push('/');
      return;
    }
    if (user && profile?.role === 'business') {
      fetchBilling();
    }
  }, [user, profile, authLoading]);

  const fetchBilling = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/billing?userId=${user.uid}`);
      const data = await res.json();
      setBalance(data.balance || 0);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch billing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0 || !user) return;
    setAdding(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setAddAmount('');
        await refreshProfile();
        fetchBilling();
      }
    } catch (err) {
      console.error('Failed to add funds:', err);
    } finally {
      setAdding(false);
    }
  };

  const presetAmounts = [25, 50, 100, 250];

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
        <h1 className="mb-1 text-3xl font-bold">Billing</h1>
        <p className="mb-8 text-zinc-400">Manage your account balance and view transactions</p>

        {/* Balance Card */}
        <div className="mb-8 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-8">
          <div className="text-sm font-medium text-zinc-400">Current Balance</div>
          <div className="mt-1 text-4xl font-bold">${balance.toFixed(2)}</div>
          <p className="mt-2 text-sm text-zinc-500">
            Funds are deducted when you approve submissions
          </p>
        </div>

        {/* Add Funds */}
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Add Funds</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            {presetAmounts.map(amt => (
              <button
                key={amt}
                onClick={() => setAddAmount(String(amt))}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  addAmount === String(amt)
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
          <form onSubmit={handleAddFunds} className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={addAmount}
                onChange={e => setAddAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-7 pr-4 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !addAmount || parseFloat(addAmount) <= 0}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Funds'}
            </button>
          </form>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                      tx.amount > 0
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.amount > 0 ? '+' : '−'}
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
                  <div className={`text-sm font-semibold ${
                    tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.amount > 0 ? '+' : '−'}${Math.abs(tx.amount).toFixed(2)}
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
