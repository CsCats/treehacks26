'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const NotebookViewer = dynamic(() => import('@/components/NotebookViewer'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-white text-lg">Loading notebook...</div>
    </div>
  ),
});

function NotebookContent() {
  const searchParams = useSearchParams();
  const taskTitle = searchParams.get('task') || 'Sample Task';
  const [submissionCount, setSubmissionCount] = useState(0);
  const [dataPreview, setDataPreview] = useState({
    totalFrames: 0,
    avgKeypoints: 0,
    duration: '0:00',
  });

  useEffect(() => {
    // Fetch real submission data
    const taskId = searchParams.get('taskId');
    if (taskId) {
      fetch(`/api/submissions?taskId=${taskId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const totalFrames = data.reduce((sum, sub) => {
              return sum + (sub.poseData?.length || 0);
            }, 0);
            const avgKeypoints = totalFrames / (data.length || 1);
            const totalSeconds = data.reduce((sum, sub) => {
              const frames = sub.poseData?.length || 0;
              return sum + frames / 30; // Assuming 30fps
            }, 0);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);

            setSubmissionCount(data.length);
            setDataPreview({
              totalFrames,
              avgKeypoints: Math.round(avgKeypoints),
              duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            });
          }
        })
        .catch(err => {
          console.error('Failed to fetch submissions:', err);
          // Use demo data
          setSubmissionCount(42);
          setDataPreview({
            totalFrames: 15680,
            avgKeypoints: 373,
            duration: '8:43',
          });
        });
    } else {
      // Demo data
      setSubmissionCount(42);
      setDataPreview({
        totalFrames: 15680,
        avgKeypoints: 373,
        duration: '8:43',
      });
    }
  }, [searchParams]);

  return (
    <NotebookViewer
      taskTitle={taskTitle}
      submissionCount={submissionCount}
      dataPreview={dataPreview}
    />
  );
}

export default function NotebookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-white text-lg">Loading notebook...</div>
      </div>
    }>
      <NotebookContent />
    </Suspense>
  );
}
