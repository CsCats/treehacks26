'use client';

import { useState } from 'react';

export default function BusinessView() {
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
    // TODO: Send to backend
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-2xl font-semibold">Create Training Task Prompt</h1>
      
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
        <div>
          <label className="block mb-2 text-sm font-medium">Task Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the task you want users to record..."
            className="w-full rounded border border-gray-300 p-3"
            rows={6}
          />
        </div>

        <div className="rounded border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-4 font-semibold text-black">Example Requirements</h2>
          <div className="space-y-2 text-sm text-black">
            <div>
              <span className="font-medium">Task:</span> {requirements.task}
            </div>
            <div>
              <span className="font-medium">Duration:</span> {requirements.duration}
            </div>
            <div>
              <span className="font-medium">Quality:</span> {requirements.quality}
            </div>
            <div>
              <span className="font-medium">Camera Angle:</span> {requirements.angle}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
        >
          Post Task
        </button>
      </form>
    </div>
  );
}
