'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/lib/ThemeContext';

interface NotebookCell {
  type: 'code' | 'markdown';
  content: string;
  language?: string;
  output?: string;
  cellId?: number;
}

interface NotebookViewerProps {
  taskTitle: string;
  submissionCount: number;
  dataPreview: {
    totalFrames: number;
    avgKeypoints: number;
    duration: string;
  };
}

export default function NotebookViewer({ taskTitle, submissionCount, dataPreview }: NotebookViewerProps) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const [executedCells, setExecutedCells] = useState<Set<number>>(new Set());
  const [isRunningAll, setIsRunningAll] = useState(false);

  const cells: NotebookCell[] = [
    {
      type: 'markdown',
      content: `# 📊 Motion Capture Data Analysis
**Task:** ${taskTitle}
**Submissions:** ${submissionCount}
**Total Frames:** ${dataPreview.totalFrames.toLocaleString()}

This notebook shows how to load and analyze your pose data for ML training.`,
    },
    {
      type: 'code',
      cellId: 1,
      language: 'python',
      content: `# Import libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print("✓ Libraries loaded")`,
      output: '✓ Libraries loaded',
    },
    {
      type: 'code',
      cellId: 2,
      language: 'python',
      content: `# Load your pose data from the API
import requests

url = "https://your-app.vercel.app/api/submissions?taskId=${taskTitle}"
response = requests.get(url)
submissions = response.json()

print(f"📦 Loaded {len(submissions)} submissions")
print(f"📊 Total frames: ${dataPreview.totalFrames.toLocaleString()}")
print(f"⏱️  Total duration: ${dataPreview.duration}")
print(f"📈 Avg frames/video: ${dataPreview.avgKeypoints}")`,
      output: `📦 Loaded ${submissionCount} submissions
📊 Total frames: ${dataPreview.totalFrames.toLocaleString()}
⏱️  Total duration: ${dataPreview.duration}
📈 Avg frames/video: ${dataPreview.avgKeypoints}`,
    },
    {
      type: 'markdown',
      content: `## 🔍 Data Structure
Each submission contains pose keypoints in 3D (x, y, z coordinates):`,
    },
    {
      type: 'code',
      cellId: 3,
      language: 'python',
      content: `# Inspect first submission
first_sub = submissions[0]

print(f"Video URL: {first_sub['videoUrl']}")
print(f"Pose Data URL: {first_sub['poseUrl']}")
print(f"Status: {first_sub['status']}")
print(f"Frames: {len(first_sub['poseData'])}")
print()
print("First frame keypoints:")
print(f"  - Nose: x={first_sub['poseData'][0]['keypoints'][0]['x']:.1f}, " +
      f"y={first_sub['poseData'][0]['keypoints'][0]['y']:.1f}, " +
      f"z={first_sub['poseData'][0]['keypoints'][0]['z']:.3f}")
print(f"  - Left shoulder: x={first_sub['poseData'][0]['keypoints'][11]['x']:.1f}, " +
      f"y={first_sub['poseData'][0]['keypoints'][11]['y']:.1f}")`,
      output: `Video URL: https://storage.googleapis.com/.../video.webm
Pose Data URL: https://storage.googleapis.com/.../pose.json
Status: approved
Frames: ${dataPreview.avgKeypoints}

First frame keypoints:
  - Nose: x=320.5, y=240.1, z=-0.524
  - Left shoulder: x=280.3, y=290.5`,
    },
    {
      type: 'markdown',
      content: `## 📈 Basic Statistics`,
    },
    {
      type: 'code',
      cellId: 4,
      language: 'python',
      content: `# Calculate basic stats
frame_counts = [len(sub['poseData']) for sub in submissions]

print(f"Frame count statistics:")
print(f"  Min: {min(frame_counts)} frames")
print(f"  Max: {max(frame_counts)} frames")
print(f"  Mean: {np.mean(frame_counts):.1f} frames")
print(f"  Median: {np.median(frame_counts):.1f} frames")
print()
print(f"Video lengths (at 30fps):")
print(f"  Shortest: {min(frame_counts)/30:.1f}s")
print(f"  Longest: {max(frame_counts)/30:.1f}s")`,
      output: `Frame count statistics:
  Min: ${Math.floor(dataPreview.avgKeypoints * 0.6)} frames
  Max: ${Math.floor(dataPreview.avgKeypoints * 1.4)} frames
  Mean: ${dataPreview.avgKeypoints}.0 frames
  Median: ${dataPreview.avgKeypoints}.0 frames

Video lengths (at 30fps):
  Shortest: ${(dataPreview.avgKeypoints * 0.6 / 30).toFixed(1)}s
  Longest: ${(dataPreview.avgKeypoints * 1.4 / 30).toFixed(1)}s`,
    },
    {
      type: 'markdown',
      content: `## 💾 Export Data for Training`,
    },
    {
      type: 'code',
      cellId: 5,
      language: 'python',
      content: `# Export to formats useful for ML training

# 1. CSV format (for pandas/sklearn)
import csv

with open('pose_data.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['video_id', 'frame', 'keypoint_id', 'x', 'y', 'z', 'score'])

    for sub_idx, sub in enumerate(submissions):
        for frame_idx, frame in enumerate(sub['poseData']):
            for kp_idx, kp in enumerate(frame['keypoints']):
                writer.writerow([
                    f"video_{sub_idx}",
                    frame_idx,
                    kp_idx,
                    kp['x'], kp['y'], kp['z'], kp.get('score', 1.0)
                ])

print("✓ Exported to pose_data.csv")

# 2. JSON format (for PyTorch/TensorFlow)
import json

with open('pose_data.json', 'w') as f:
    json.dump(submissions, f, indent=2)

print("✓ Exported to pose_data.json")

# 3. NumPy arrays (for direct ML use)
import numpy as np

all_poses = []
for sub in submissions:
    video_poses = []
    for frame in sub['poseData']:
        frame_poses = [[kp['x'], kp['y'], kp['z']] for kp in frame['keypoints']]
        video_poses.append(frame_poses)
    all_poses.append(video_poses)

np.save('pose_data.npy', all_poses)
print("✓ Exported to pose_data.npy")`,
      output: `✓ Exported to pose_data.csv
✓ Exported to pose_data.json
✓ Exported to pose_data.npy

Files ready for:
- CSV → pandas, sklearn
- JSON → PyTorch, TensorFlow
- NPY → NumPy, direct array operations`,
    },
    {
      type: 'markdown',
      content: `## 🤖 Next Steps for ML Training

Now that you have the data exported, you can:

**1. Train Robot Models**
\`\`\`python
# Use the exported data with your robot training pipeline
import torch
from your_robot_lib import train_imitation_model

model = train_imitation_model(data='pose_data.json')
\`\`\`

**2. Build Action Classifiers**
\`\`\`python
from sklearn.ensemble import RandomForestClassifier

# Extract features and train
clf = RandomForestClassifier()
clf.fit(X_train, y_train)
\`\`\`

**3. Quality Control**
\`\`\`python
# Use AI to verify task completion
from openai import OpenAI

client = OpenAI()
result = client.compare_poses(reference, submission)
\`\`\``,
    },
  ];

  const runAllCells = async () => {
    setIsRunningAll(true);
    const newExecuted = new Set<number>();

    for (let i = 0; i < cells.length; i++) {
      if (cells[i].type === 'code') {
        await new Promise(resolve => setTimeout(resolve, 300));
        newExecuted.add(i);
        setExecutedCells(new Set(newExecuted));
      }
    }

    setIsRunningAll(false);
  };

  const runCell = async (index: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setExecutedCells(new Set([...executedCells, index]));
  };

  return (
    <div className={`min-h-screen p-4 ${isDark ? 'bg-[#1e1e1e] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Notebook Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className={`flex items-center justify-between border-b px-4 py-3 rounded-t-lg ${
          isDark ? 'bg-[#2d2d2d] border-zinc-700' : 'bg-white border-zinc-300'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className={`text-sm font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              motion_analysis.ipynb
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runAllCells}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium transition"
            >
              {isRunningAll ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Running...
                </>
              ) : (
                <>
                  ▶️ Run All
                </>
              )}
            </button>
            <button className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
            }`}>
              📥 Download .ipynb
            </button>
            <button className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
            }`}>
              🔗 Open in Colab
            </button>
          </div>
        </div>

        {/* Cells */}
        <div className={`rounded-b-lg ${isDark ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          {cells.map((cell, index) => (
            <div
              key={index}
              className={`border-b last:border-b-0 ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}
            >
              {cell.type === 'markdown' && (
                <div className="px-6 py-4">
                  <div
                    className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}
                    dangerouslySetInnerHTML={{
                      __html: cell.content
                        .replace(/^# (.+)/gm, '<h1 class="text-2xl font-bold mb-2">$1</h1>')
                        .replace(/^## (.+)/gm, '<h2 class="text-xl font-semibold mb-2 mt-4">$1</h2>')
                        .replace(/\*\*(.+?)\*\*/g, `<strong class="font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}">$1</strong>`)
                        .replace(/- (.+)/g, '<li class="ml-4">$1</li>')
                        .replace(/`(.+?)`/g, `<code class="${isDark ? 'bg-zinc-800 text-green-400' : 'bg-zinc-200 text-green-700'} px-1.5 py-0.5 rounded text-sm">$1</code>`)
                    }}
                  />
                </div>
              )}

              {cell.type === 'code' && (
                <div className="flex">
                  <div className={`flex-shrink-0 w-16 border-r flex flex-col items-center justify-start pt-3 ${
                    isDark ? 'bg-[#252526] border-zinc-700' : 'bg-zinc-100 border-zinc-300'
                  }`}>
                    <button
                      onClick={() => runCell(index)}
                      disabled={executedCells.has(index) || isRunningAll}
                      className={`text-xs transition mb-1 ${
                        executedCells.has(index)
                          ? 'text-green-500'
                          : isDark
                          ? 'text-zinc-500 hover:text-white'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {executedCells.has(index) ? '✓' : '▶'}
                    </button>
                    <span className={`text-xs font-mono ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      [{executedCells.has(index) ? index + 1 : ' '}]
                    </span>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <SyntaxHighlighter
                      language={cell.language || 'python'}
                      style={isDark ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        padding: '12px 16px',
                        background: isDark ? '#1e1e1e' : '#ffffff',
                        fontSize: '13px',
                      }}
                      showLineNumbers={false}
                    >
                      {cell.content}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}

              {/* Output - only show if code cell was executed */}
              {cell.type === 'code' && cell.cellId && executedCells.has(index) && cell.output && (
                <div className={`border-t ${
                  isDark ? 'bg-[#1e1e1e] border-zinc-800' : 'bg-zinc-50 border-zinc-300'
                }`}>
                  <div className="flex">
                    <div className="w-16 flex-shrink-0" />
                    <pre className={`flex-1 px-4 py-3 text-sm font-mono whitespace-pre-wrap ${
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    }`}>
                      {cell.output}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`mt-4 flex items-center justify-between text-xs ${
          isDark ? 'text-zinc-500' : 'text-zinc-600'
        }`}>
          <div className="flex items-center gap-4">
            <span>Kernel: Python 3.11.7</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          </div>
          <div>
            Last saved: Just now
          </div>
        </div>
      </div>
    </div>
  );
}
