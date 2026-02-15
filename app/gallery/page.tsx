'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

interface Submission {
  id: string;
  user: string;
  date: string;
  duration: string;
  status: 'approved' | 'pending' | 'rejected';
}

const submissions: Submission[] = [
  { id: '1', user: 'Alice M.', date: 'Feb 12, 2026', duration: '6:32', status: 'approved' },
  { id: '2', user: 'Bob K.', date: 'Feb 13, 2026', duration: '8:15', status: 'pending' },
  { id: '3', user: 'Carol T.', date: 'Feb 13, 2026', duration: '5:47', status: 'approved' },
  { id: '4', user: 'David R.', date: 'Feb 14, 2026', duration: '7:03', status: 'rejected' },
  { id: '5', user: 'Eva S.', date: 'Feb 14, 2026', duration: '9:21', status: 'pending' },
  { id: '6', user: 'Frank L.', date: 'Feb 14, 2026', duration: '5:55', status: 'approved' },
];

const statusStyles: Record<string, string> = {
  approved: 'bg-green-500/15 text-green-400',
  pending: 'bg-yellow-500/15 text-yellow-400',
  rejected: 'bg-red-500/15 text-red-400',
};

// Load a script tag dynamically
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

export default function Gallery() {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const loadPoseModel = useCallback(async () => {
    if (detectorRef.current || loadingModel) return;
    setLoadingModel(true);
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection');

      const poseDetection = window.poseDetection;

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'mediapipe',
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose',
          modelType: 'full',
        }
      );
      detectorRef.current = detector;
      setModelLoaded(true);
    } catch (error) {
      console.error('Error loading pose model:', error);
    } finally {
      setLoadingModel(false);
    }
  }, [loadingModel]);

  const drawKeypoints = (keypoints: Keypoint[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    // BlazePose skeleton connections (simplified for stability)
    const connections: [number, number][] = [
      [0, 7], [0, 8],                            // nose to ears
      [11, 12],                                  // shoulders
      [11, 13], [13, 15],                        // left arm
      [12, 14], [14, 16],                        // right arm
      [15, 17], [15, 19], [15, 21],             // left hand
      [16, 18], [16, 20], [16, 22],             // right hand
      [11, 23], [12, 24],                        // shoulders to hips
      [23, 24],                                  // hips
      [23, 25], [25, 27],                        // left leg
      [24, 26], [26, 28],                        // right leg
      [27, 29], [27, 31],                        // left foot
      [28, 30], [28, 32],                        // right foot
    ];
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    for (const [a, b] of connections) {
      const kpA = keypoints[a]; const kpB = keypoints[b];
      if (kpA && kpB && (kpA.score ?? 1) > 0.3 && (kpB.score ?? 1) > 0.3) {
        ctx.beginPath(); ctx.moveTo(kpA.x, kpA.y); ctx.lineTo(kpB.x, kpB.y); ctx.stroke();
      }
    }
    for (const kp of keypoints) {
      if ((kp.score ?? 1) > 0.3) {
        ctx.beginPath(); ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff3366'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  };

  const runDetection = useCallback(async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!detector || !video || !canvas || video.paused || video.ended || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    try {
      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        drawKeypoints(poses[0].keypoints, ctx, canvas.width, canvas.height);
      }
    } catch (err) {
      console.error('Pose detection error:', err);
    }
    animFrameRef.current = requestAnimationFrame(runDetection);
  }, []);

  const handleRunPose = async () => {
    if (!videoRef.current) return;
    setDetecting(true);
    await loadPoseModel();
    animFrameRef.current = requestAnimationFrame(runDetection);
  };

  const handleStopPose = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setDetecting(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const selected = submissions.find(s => s.id === selectedId);

  // --- EXPANDED VIDEO VIEW ---
  if (selected) {
    return (
      <div className="min-h-screen p-8 text-zinc-900 dark:text-white">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => { handleStopPose(); setSelectedId(null); }}
            className="mb-6 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
          >
            ← Back to Gallery
          </button>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{selected.user}&apos;s Submission</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Folding Laundry · {selected.date} · {selected.duration}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[selected.status]}`}>
              {selected.status}
            </span>
          </div>

          {/* Video + Canvas overlay */}
          <div className="relative mb-4 rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full"
              controls
              playsInline
            >
              {/* Replace src with real video URL when available */}
              Your browser does not support video.
            </video>
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
            />

            {/* Placeholder overlay when no video source */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100/90 dark:bg-zinc-900/80">
              <svg className="mb-3 h-16 w-16 text-zinc-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-zinc-500 text-sm">Video placeholder — add src to play</p>
            </div>
          </div>

          {/* TensorFlow Pose Controls */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">TensorFlow Pose Detection</h3>
                <p className="text-sm text-zinc-500">
                  BlazePose 3D (Full) — runs in-browser with depth estimation
                </p>
              </div>
              <div className="flex items-center gap-3">
                {loadingModel && (
                  <span className="text-sm text-yellow-400">Loading model...</span>
                )}
                {modelLoaded && (
                  <span className="flex items-center gap-1 text-sm text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-400" /> Model ready
                  </span>
                )}
                {!detecting ? (
                  <button
                    onClick={handleRunPose}
                    disabled={loadingModel}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Run Pose Detection
                  </button>
                ) : (
                  <button
                    onClick={handleStopPose}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Stop Detection
                  </button>
                )}
              </div>
            </div>
            {detecting && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500 dark:bg-green-400" />
                Detecting poses in real-time — skeleton overlay on video
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- GALLERY GRID VIEW ---
  return (
    <div className="min-h-screen p-8 text-zinc-900 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/businessView" className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
          ← Back
        </a>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Submissions gallery</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Task: <span className="font-medium text-zinc-900 dark:text-white">Folding Laundry</span>
          </p>
          <p className="text-sm text-zinc-500">{submissions.length} submissions received</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {(['all', 'approved', 'pending', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                filter === tab
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedId(sub.id)}
              className="group overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:shadow-none"
            >
              {/* Video Thumbnail Placeholder */}
              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center">
                <svg className="h-12 w-12 text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-600">{sub.duration}</span>

                {/* TF badge */}
                <div className="absolute bottom-2 right-2 rounded bg-white/80 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
                  TF Pose Ready
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-zinc-900 dark:text-white">{sub.user}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[sub.status]}`}>
                    {sub.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{sub.date} · {sub.duration}</p>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-12 rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">No submissions match this filter.</div>
        )}
      </div>
    </div>
  );
}
