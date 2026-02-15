'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [executionOrder, setExecutionOrder] = useState<Map<number, number>>(new Map());
  const [executionCount, setExecutionCount] = useState(0);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [cellContents, setCellContents] = useState<Map<number, string>>(new Map());
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiUrl(`${window.location.origin}/api/submissions?taskId=${taskTitle}`);
    }
  }, [taskTitle]);

  const initialCells: NotebookCell[] = useMemo(() => [
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

url = "${apiUrl}"
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
  ], [taskTitle, submissionCount, dataPreview, apiUrl]);

  const [cells, setCells] = useState(initialCells);

  // Update cells when props or apiUrl changes
  useEffect(() => {
    setCells(initialCells);
  }, [initialCells]);

  const runAllCells = async () => {
    setIsRunningAll(true);
    const newExecuted = new Set<number>();
    const newOrder = new Map<number, number>();
    let count = 1;

    for (let i = 0; i < cells.length; i++) {
      if (cells[i].type === 'code') {
        await new Promise(resolve => setTimeout(resolve, 300));
        newExecuted.add(i);
        newOrder.set(i, count);
        count++;
        setExecutedCells(new Set(newExecuted));
        setExecutionOrder(new Map(newOrder));
        setExecutionCount(count - 1);
      }
    }

    setIsRunningAll(false);
  };

  const runCell = async (index: number) => {
    if (!executedCells.has(index)) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const newExecuted = new Set([...executedCells, index]);
      const newOrder = new Map(executionOrder);
      newOrder.set(index, executionCount + 1);
      setExecutedCells(newExecuted);
      setExecutionOrder(newOrder);
      setExecutionCount(executionCount + 1);
    }
  };

  const updateCellContent = (index: number, newContent: string) => {
    const newCells = [...cells];
    newCells[index] = { ...newCells[index], content: newContent };
    // Clear execution state when cell is edited
    if (executedCells.has(index)) {
      const newExecuted = new Set(executedCells);
      newExecuted.delete(index);
      setExecutedCells(newExecuted);
      const newOrder = new Map(executionOrder);
      newOrder.delete(index);
      setExecutionOrder(newOrder);
    }
    setCells(newCells);
  };

  const downloadNotebook = () => {
    const notebookData = {
      cells: cells.map(cell => ({
        cell_type: cell.type === 'code' ? 'code' : 'markdown',
        execution_count: cell.type === 'code' && cell.cellId ? cell.cellId : null,
        metadata: {},
        source: cell.content.split('\n'),
        outputs: cell.type === 'code' && cell.output ? [{
          output_type: 'stream',
          name: 'stdout',
          text: cell.output.split('\n')
        }] : []
      })),
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          name: 'python',
          version: '3.11.7'
        }
      },
      nbformat: 4,
      nbformat_minor: 5
    };

    const blob = new Blob([JSON.stringify(notebookData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'motion_analysis.ipynb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openInColab = () => {
    const notebookData = {
      cells: cells.map(cell => ({
        cell_type: cell.type === 'code' ? 'code' : 'markdown',
        execution_count: null,
        metadata: {},
        source: cell.content.split('\n'),
        outputs: []
      })),
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        }
      },
      nbformat: 4,
      nbformat_minor: 5
    };

    const notebookJson = JSON.stringify(notebookData);
    const encoded = encodeURIComponent(notebookJson);
    const colabUrl = `https://colab.research.google.com/notebook#create=true&data=${encoded}`;
    window.open(colabUrl, '_blank');
  };

  return (
    <div className={`min-h-screen p-4 ${isDark ? 'bg-[#1e1e1e] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Notebook Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className={`flex items-center justify-between border-b px-4 py-3 rounded-t-lg ${
          isDark ? 'bg-[#2d2d2d] border-zinc-700' : 'bg-white border-zinc-300 shadow-sm'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className={`text-sm font-mono font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              motion_analysis.ipynb
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAllCells}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white text-sm font-semibold transition shadow-sm"
            >
              {isRunningAll ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Run All
                </>
              )}
            </button>
            <button
              onClick={downloadNotebook}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition shadow-sm ${
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={openInColab}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition shadow-sm ${
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
              }`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.9414 4.9757a7.033 7.033 0 0 0-4.9308 2.0646 7.033 7.033 0 0 0-.1232 9.8068l2.395-2.395a3.6455 3.6455 0 0 1 5.1497-5.1478l2.397-2.3989a7.033 7.033 0 0 0-4.8877-1.9297zM7.07 4.9855a7.033 7.033 0 0 0-4.8878 1.9316l2.3911 2.3911a3.6434 3.6434 0 0 1 5.0227.1271l1.7341-2.9737-.0997-.0802A7.033 7.033 0 0 0 7.07 4.9855zm15.0093 2.1721l-2.3892 2.3911a3.6455 3.6455 0 0 1-5.1497 5.1497l-2.4067 2.4068a7.0362 7.0362 0 0 0 9.9456-9.9476zM1.932 7.1674a7.033 7.033 0 0 0-.002 9.6816c2.3911-2.3911 4.7841-4.7841 7.1751-7.1751a7.033 7.033 0 0 0-7.1731-2.5065z"/>
              </svg>
              Colab
            </button>
          </div>
        </div>

        {/* Cells */}
        <div className={`rounded-b-lg ${isDark ? 'bg-[#2d2d2d]' : 'bg-white shadow-sm'}`}>
          {cells.map((cell, index) => (
            <div
              key={index}
              className={`border-b last:border-b-0 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}
            >
              {cell.type === 'markdown' && (
                <div className="px-6 py-4">
                  {editingCell === index ? (
                    <textarea
                      value={cell.content}
                      onChange={(e) => updateCellContent(index, e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      className={`w-full min-h-[100px] p-2 rounded border font-mono text-sm ${
                        isDark
                          ? 'bg-zinc-800 border-zinc-700 text-white'
                          : 'bg-white border-zinc-300 text-zinc-900'
                      }`}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setEditingCell(index)}
                      className={`prose max-w-none cursor-text ${isDark ? 'prose-invert' : ''}`}
                      dangerouslySetInnerHTML={{
                        __html: cell.content
                          .replace(/^# (.+)/gm, `<h1 class="text-2xl font-bold mb-2 ${isDark ? '' : 'font-extrabold'}">$1</h1>`)
                          .replace(/^## (.+)/gm, `<h2 class="text-xl font-semibold mb-2 mt-4 ${isDark ? '' : 'font-bold'}">$1</h2>`)
                          .replace(/\*\*(.+?)\*\*/g, `<strong class="font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600 font-bold'}">$1</strong>`)
                          .replace(/- (.+)/g, '<li class="ml-4">$1</li>')
                          .replace(/`(.+?)`/g, `<code class="${isDark ? 'bg-zinc-800 text-green-400' : 'bg-zinc-200 text-green-700 font-semibold'} px-1.5 py-0.5 rounded text-sm">$1</code>`)
                      }}
                    />
                  )}
                </div>
              )}

              {cell.type === 'code' && (
                <div className="flex">
                  <div className={`flex-shrink-0 w-16 border-r flex flex-col items-center justify-start pt-4 ${
                    isDark ? 'bg-[#252526] border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <button
                      onClick={() => runCell(index)}
                      disabled={isRunningAll}
                      className={`w-8 h-8 rounded-md flex items-center justify-center transition mb-2 ${
                        executedCells.has(index)
                          ? 'bg-green-600 text-white'
                          : isDark
                          ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                          : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                      }`}
                      title="Run cell"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                    <span className={`text-xs font-mono font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      [{executionOrder.get(index) || ' '}]
                    </span>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    {editingCell === index ? (
                      <textarea
                        value={cell.content}
                        onChange={(e) => updateCellContent(index, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className={`w-full min-h-[150px] p-4 font-mono text-sm ${
                          isDark
                            ? 'bg-[#1e1e1e] text-white'
                            : 'bg-white text-zinc-900'
                        }`}
                        style={{ fontSize: '13px' }}
                        autoFocus
                      />
                    ) : (
                      <div onClick={() => setEditingCell(index)} className="cursor-text">
                        <SyntaxHighlighter
                          language={cell.language || 'python'}
                          style={isDark ? vscDarkPlus : vs}
                          customStyle={{
                            margin: 0,
                            padding: '12px 16px',
                            background: isDark ? '#1e1e1e' : '#ffffff',
                            fontSize: '13px',
                            fontWeight: isDark ? 400 : 500,
                          }}
                          showLineNumbers={false}
                        >
                          {cell.content}
                        </SyntaxHighlighter>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Output - only show if code cell was executed */}
              {cell.type === 'code' && cell.cellId && executedCells.has(index) && cell.output && (
                <div className={`border-t ${
                  isDark ? 'bg-[#1e1e1e] border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="flex">
                    <div className="w-16 flex-shrink-0" />
                    <pre className={`flex-1 px-4 py-3 text-sm font-mono whitespace-pre-wrap ${
                      isDark ? 'text-zinc-300 font-normal' : 'text-zinc-800 font-medium'
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
        <div className={`mt-4 space-y-2`}>
          <div className={`flex items-center justify-between text-xs font-medium ${
            isDark ? 'text-zinc-500' : 'text-zinc-600'
          }`}>
            <div className="flex items-center gap-4">
              <span>Kernel: Python 3.11.7 (Demo)</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Connected
              </span>
            </div>
            <div>
              Last saved: Just now
            </div>
          </div>
          <div className={`text-xs italic ${
            isDark ? 'text-zinc-600' : 'text-zinc-500'
          }`}>
            Note: This is a demo notebook with pre-generated outputs. Download or open in Colab to run actual Python code.
          </div>
        </div>
      </div>
    </div>
  );
}
