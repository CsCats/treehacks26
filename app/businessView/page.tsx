'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessView() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [requirements, setRequirements] = useState({
    task: 'folding laundry',
    duration: '5-10 minutes',
    quality: 'HD (720p minimum)',
    angle: 'overhead or side view',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Prompt:', prompt);
    console.log('Requirements:', requirements);
    router.push('/gallery');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-foreground">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <a href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors duration-200">
            ← Home
          </a>
          <a
            href="/analytics"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg transition-all duration-200 hover:from-orange-600 hover:to-pink-600 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 font-medium text-sm"
          >
            <span>📊</span>
            View Analytics
          </a>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Create training task</h1>
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">Describe the task you want contributors to record</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Task prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the task you want users to record…"
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder-zinc-400 transition-colors duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder-zinc-500"
              rows={6}
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-200">Example requirements</h2>
            <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Task:</span> {requirements.task}</div>
              <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Duration:</span> {requirements.duration}</div>
              <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Quality:</span> {requirements.quality}</div>
              <div><span className="font-medium text-zinc-700 dark:text-zinc-300">Camera angle:</span> {requirements.angle}</div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:from-blue-400 hover:to-purple-500 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            Post task
          </button>
        </form>

      </div>
    </div>
  );
}
