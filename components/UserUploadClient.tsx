'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/AuthContext';

const PoseSkeletonViewer = dynamic(() => import('@/components/PoseSkeletonViewer'), {
  ssr: false,
  loading: () => <div className="w-[500px] h-[400px] bg-zinc-200 dark:bg-zinc-900 rounded-lg animate-pulse" />,
});

interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string;
  businessId: string;
  businessName: string;
  pricePerApproval: number;
  deadline?: string | null;
  status?: 'open' | 'closed';
  submissionCount: number;
}

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

interface PoseFrame {
  timestamp: number;
  keypoints: Keypoint[];
}

type AppPhase = 'select-task' | 'camera' | 'review';

// Load a script tag dynamically and return a promise
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

export default function UserUploadClient() {
  const { user, profile } = useAuth();
  const [phase, setPhase] = useState<AppPhase>('select-task');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [currentKeypoints, setCurrentKeypoints] = useState<Keypoint[]>([]);
  const [recordedFrames, setRecordedFrames] = useState<PoseFrame[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [posePreviewFrameIndex, setPosePreviewFrameIndex] = useState(0);
  const [posePlaying, setPosePlaying] = useState(false);
  const [faceBlurEnabled, setFaceBlurEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<PoseFrame[]>([]);
  const faceBlurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceBlurEnabledRef = useRef(faceBlurEnabled);

  faceBlurEnabledRef.current = faceBlurEnabled;

  // Create/revoke blob URL when recordedBlob changes
  useEffect(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      setRecordedBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setRecordedBlobUrl(null);
      };
    } else {
      setRecordedBlobUrl(null);
    }
  }, [recordedBlob]);

  // Fetch tasks on mount
  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(err => console.error('Failed to fetch tasks:', err));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stream]);

  // Frame player: advance one frame while playing, stop at end
  useEffect(() => {
    if (!posePlaying || phase !== 'review' || recordedFrames.length === 0) return;
    const interval = setInterval(() => {
      setPosePreviewFrameIndex(i => {
        if (i >= recordedFrames.length - 1) {
          setPosePlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [posePlaying, phase, recordedFrames.length]);

  // Frame → Video: when user moves the frame (slider, prev/next, play), seek the review video to that time
  const seekReviewVideoToFrame = useCallback((frameIndex: number) => {
    const video = reviewVideoRef.current;
    if (!video || recordedFrames.length === 0) return;
    const frame = recordedFrames[frameIndex] ?? recordedFrames[0];
    const firstTs = recordedFrames[0].timestamp;
    const timeSeconds = (frame.timestamp - firstTs) / 1000;
    if (Number.isFinite(timeSeconds) && timeSeconds >= 0) {
      video.currentTime = Math.min(timeSeconds, video.duration || 0);
    }
  }, [recordedFrames]);

  useEffect(() => {
    if (phase !== 'review' || recordedFrames.length === 0) return;
    seekReviewVideoToFrame(posePreviewFrameIndex);
  }, [phase, posePreviewFrameIndex, recordedFrames.length, seekReviewVideoToFrame]);

  const loadPoseModel = useCallback(async () => {
    if (detectorRef.current || loadingModel) return;
    setLoadingModel(true);
    try {
      // Load MediaPipe and pose-detection for true 3D support
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

  // BlazePose face keypoints: 0 nose, 2 left_eye, 5 right_eye, 7 left_ear, 8 right_ear
  // Expand box to cover full face (forehead, cheeks, chin), not just eyes/nose
  const getFaceBbox = useCallback(
    (keypoints: Keypoint[], canvasWidth: number, canvasHeight: number) => {
      const faceIndices = [0, 2, 5, 7, 8]; // nose, eyes, ears
      const valid = faceIndices
        .map((i) => keypoints[i])
        .filter((kp) => kp && (kp.score ?? 1) > 0.3);
      if (valid.length === 0) return null;
      const xs = valid.map((k) => k.x);
      const ys = valid.map((k) => k.y);
      const rangeX = Math.max(...xs) - Math.min(...xs) || 40;
      const rangeY = Math.max(...ys) - Math.min(...ys) || 50;
      // Tighter horizontal (just face width); more vertical (forehead + chin)
      const padX = rangeX * 0.45;
      const padY = rangeY * 2;
      let minX = Math.min(...xs) - padX;
      let maxX = Math.max(...xs) + padX;
      let minY = Math.min(...ys) - padY;
      let maxY = Math.max(...ys) + padY;
      // Minimum size: face-shaped (narrower than tall), don't force a wide box
      const minW = Math.min(canvasWidth, canvasHeight) * 0.1;
      const minH = Math.min(canvasWidth, canvasHeight) * 0.22;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const w = Math.max(maxX - minX, minW);
      const h = Math.max(maxY - minY, minH);
      minX = cx - w / 2;
      maxX = cx + w / 2;
      minY = cy - h / 2;
      maxY = cy + h / 2;
      // Clamp to canvas
      minX = Math.max(0, minX);
      minY = Math.max(0, minY);
      maxX = Math.min(canvasWidth, maxX);
      maxY = Math.min(canvasHeight, maxY);
      const outW = maxX - minX;
      const outH = maxY - minY;
      if (outW < 20 || outH < 20) return null;
      return { x: minX, y: minY, w: outW, h: outH };
    },
    []
  );

  const blurFaceRegion = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      keypoints: Keypoint[],
      width: number,
      height: number,
      blurPx = 16
    ) => {
      const bbox = getFaceBbox(keypoints, width, height);
      if (!bbox) return;
      let off = faceBlurCanvasRef.current;
      if (!off) {
        off = document.createElement('canvas');
        faceBlurCanvasRef.current = off;
      }
      const { x, y, w, h } = bbox;
      const iw = Math.max(1, Math.floor(w));
      const ih = Math.max(1, Math.floor(h));
      off.width = iw;
      off.height = ih;
      const offCtx = off.getContext('2d');
      if (!offCtx) return;
      offCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, iw, ih);
      offCtx.filter = `blur(${blurPx}px)`;
      offCtx.drawImage(off, 0, 0);
      offCtx.filter = 'none';
      ctx.drawImage(off, 0, 0, iw, ih, x, y, w, h);
    },
    [getFaceBbox]
  );

  const drawKeypoints = useCallback(
    (
      keypoints: Keypoint[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      skipClear = false
    ) => {
      if (!skipClear) ctx.clearRect(0, 0, width, height);

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
        const kpA = keypoints[a];
        const kpB = keypoints[b];
        if (kpA && kpB && (kpA.score ?? 1) > 0.3 && (kpB.score ?? 1) > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kpA.x, kpA.y);
          ctx.lineTo(kpB.x, kpB.y);
          ctx.stroke();
        }
      }

      for (const kp of keypoints) {
        if ((kp.score ?? 1) > 0.3) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#ff3366';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    },
    []
  );

  const detectPose = useCallback(async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!detector || !video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    // Always draw current video frame (so recorded stream has video + blur + skeleton)
    ctx.drawImage(video, 0, 0, w, h);

    try {
      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        setCurrentKeypoints(keypoints);
        if (faceBlurEnabledRef.current) blurFaceRegion(ctx, keypoints, w, h);
        drawKeypoints(keypoints, ctx, w, h, true);

        if (mediaRecorderRef.current?.state === 'recording') {
          // Clean keypoints before storing to avoid NaN/Infinity issues
          const cleanedKeypoints = keypoints.map((kp: Keypoint) => ({
            x: Number.isFinite(kp.x) ? kp.x : 0,
            y: Number.isFinite(kp.y) ? kp.y : 0,
            z: Number.isFinite(kp.z) ? kp.z : 0,
            score: Number.isFinite(kp.score) ? kp.score : 0,
            name: kp.name || '',
          }));

          framesRef.current.push({
            timestamp: Date.now(),
            keypoints: cleanedKeypoints,
          });
        }
      }
    } catch (error) {
      console.error('Pose detection error:', error);
    }

    animFrameRef.current = requestAnimationFrame(detectPose);
  }, [drawKeypoints, blurFaceRegion]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      await loadPoseModel();
      setTimeout(() => {
        animFrameRef.current = requestAnimationFrame(detectPose);
      }, 500);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, [loadPoseModel, detectPose]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCurrentKeypoints([]);
  }, [stream]);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!stream || !canvas) return;
    chunksRef.current = [];
    framesRef.current = [];

    // Record from canvas (video + optional face blur + skeleton); blur follows checkbox
    const canvasStream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedFrames([...framesRef.current]);
      setPosePreviewFrameIndex(0);
      setPosePlaying(false);
      stopCamera();
      setPhase('review');
    };

    setIsRecording(true);
    mediaRecorder.start(100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleConfirm = async () => {
    if (!recordedBlob || !selectedTask) {
      alert('Missing required data. Please try recording again.');
      return;
    }

    if (recordedFrames.length === 0) {
      alert('No pose data recorded. Please try recording again.');
      return;
    }

    setUploading(true);

    try {
      // Clean pose data to ensure valid JSON (remove NaN, Infinity, etc.)
      const cleanedFrames = recordedFrames.map(frame => ({
        timestamp: frame.timestamp,
        keypoints: frame.keypoints.map(kp => ({
          x: Number.isFinite(kp.x) ? kp.x : 0,
          y: Number.isFinite(kp.y) ? kp.y : 0,
          z: Number.isFinite(kp.z) ? kp.z : 0,
          score: Number.isFinite(kp.score) ? kp.score : 0,
          name: kp.name || '',
        })),
      }));

      console.log('Uploading submission:', {
        frames: cleanedFrames.length,
        taskId: selectedTask.id,
        videoSize: recordedBlob.size,
      });

      const formData = new FormData();
      formData.append('video', recordedBlob, 'recording.webm');
      formData.append('poseData', JSON.stringify(cleanedFrames));
      formData.append('taskId', selectedTask.id);
      formData.append('businessId', selectedTask.businessId || '');
      formData.append('contributorId', user?.uid || '');
      formData.append('contributorName', profile?.displayName || '');

      const res = await fetch('/api/submissions', { method: 'POST', body: formData });
      if (res.ok) {
        setUploadSuccess(true);
      } else {
        const err = await res.json();
        console.error('Server error:', err);
        alert(`Upload failed: ${err.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReject = () => {
    setRecordedBlobUrl(null);
    setRecordedBlob(null);
    setRecordedFrames([]);
    setPhase('camera');
    setTimeout(() => startCamera(), 100);
  };

  const handleReset = () => {
    setRecordedBlobUrl(null);
    setRecordedBlob(null);
    setRecordedFrames([]);
    setUploadSuccess(false);
    setSelectedTask(null);
    setPhase('select-task');
  };

  // --- TASK SELECTION PHASE ---
  if (phase === 'select-task') {
    return (
      <div className="flex min-h-screen flex-col items-center bg-zinc-50 p-8 text-zinc-900 dark:bg-zinc-950 dark:text-white">
        <a href="/" className="mb-6 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 self-start">
          ← Back to Home
        </a>
        <h1 className="mb-2 text-3xl font-bold">Upload Training Footage</h1>
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">Select a task to contribute training data for</p>

        {tasks.length === 0 ? (
          <div className="text-zinc-600 dark:text-zinc-500">
            No tasks available yet. Businesses need to create tasks first.
          </div>
        ) : (
          <div className="grid w-full max-w-3xl gap-4">
            {tasks.map(task => {
              const isClosed = task.status === 'closed';
              const isExpired = !isClosed && task.deadline ? new Date(task.deadline) < new Date() : false;
              const isDisabled = isClosed || isExpired;

              return (
                <button
                  key={task.id}
                  onClick={() => {
                    if (isDisabled) return;
                    setSelectedTask(task);
                    setPhase('camera');
                    setTimeout(() => startCamera(), 100);
                  }}
                  disabled={isDisabled}
                  className={`rounded-xl border p-6 text-left transition ${
                    isDisabled
                      ? 'border-zinc-300 bg-zinc-100 opacity-60 cursor-not-allowed dark:border-zinc-800/50 dark:bg-zinc-900/50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{task.title}</h3>
                    {task.businessName && (
                      <span className="rounded-full bg-purple-600/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                        {task.businessName}
                      </span>
                    )}
                    {task.pricePerApproval > 0 && (
                      <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                        ${task.pricePerApproval.toFixed(2)}/video
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isClosed
                        ? 'bg-red-500/10 text-red-400'
                        : isExpired
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isClosed ? 'Closed' : isExpired ? 'Expired' : 'Open'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{task.description}</p>
                  {task.requirements && (
                    <p className="mt-2 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">Requirements:</span> {task.requirements}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-600">
                    <span>{task.submissionCount || 0} submissions</span>
                    {task.deadline && (
                      <span>
                        Deadline: {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {isDisabled && (
                    <p className="mt-2 text-xs text-red-400/70">
                      {isClosed ? 'This task is no longer accepting submissions.' : 'This task has passed its deadline.'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review') {
    if (uploadSuccess) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 text-zinc-900 dark:bg-zinc-950 dark:text-white">
          <div className="text-center">
            <div className="mb-4 text-5xl">✓</div>
            <h2 className="mb-2 text-2xl font-bold text-green-600 dark:text-green-400">Upload Successful!</h2>
            <p className="mb-6 text-zinc-500 dark:text-zinc-400">
              Your training footage has been submitted for &quot;{selectedTask?.title}&quot;
            </p>
            <button
              onClick={handleReset}
              className="rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700"
            >
              Submit Another
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center bg-zinc-50 p-8 text-zinc-900 dark:bg-zinc-950 dark:text-white">
        <h1 className="mb-2 text-2xl font-bold">Review Your Recording</h1>
        <p className="mb-6 text-zinc-500 dark:text-zinc-400">
          Task: <span className="font-medium text-zinc-900 dark:text-white">{selectedTask?.title}</span>
        </p>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Recorded Video</h3>
            {recordedBlobUrl && (
              <video
                ref={reviewVideoRef}
                src={recordedBlobUrl}
                controls
                className="w-[500px] rounded-lg bg-zinc-200 dark:bg-black"
              />
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">3D Pose</h3>
            <PoseSkeletonViewer
              keypoints={
                recordedFrames.length > 0
                  ? (recordedFrames[posePreviewFrameIndex] ?? recordedFrames[0]).keypoints
                  : []
              }
              width={500}
              height={400}
            />
            {recordedFrames.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPosePlaying(false);
                      setPosePreviewFrameIndex(i => (i <= 0 ? 0 : i - 1));
                    }}
                    disabled={posePreviewFrameIndex <= 0}
                    className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 dark:disabled:hover:bg-zinc-700"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosePlaying(p => !p)}
                    className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                  >
                    {posePlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosePlaying(false);
                      setPosePreviewFrameIndex(i =>
                        i >= recordedFrames.length - 1 ? i : i + 1
                      );
                    }}
                    disabled={posePreviewFrameIndex >= recordedFrames.length - 1}
                    className="rounded bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-40 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 dark:disabled:hover:bg-zinc-700"
                  >
                    Next
                  </button>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Frame {posePreviewFrameIndex + 1} / {recordedFrames.length}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, recordedFrames.length - 1)}
                  value={posePreviewFrameIndex}
                  onChange={(e) => {
                    setPosePlaying(false);
                    setPosePreviewFrameIndex(Number(e.target.value));
                  }}
                  className="h-2 w-full max-w-md cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-blue-500 dark:bg-zinc-700"
                />
                <p className="text-xs text-zinc-500">Drag to rotate the 3D view</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="mb-4 text-lg">Does the pose detection look correct?</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleConfirm}
              disabled={uploading}
              className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Yes, Submit'}
            </button>
            <button
              onClick={handleReject}
              disabled={uploading}
              className="rounded-lg bg-red-600 px-8 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              No, Redo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- CAMERA / RECORDING PHASE ---
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 p-8 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <button
        onClick={() => { stopCamera(); setPhase('select-task'); }}
        className="mb-6 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 self-start"
      >
        ← Back to Tasks
      </button>

      <div className="mb-6 flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left: video + controls */}
        <div className="flex flex-1 flex-col items-center">
          <h1 className="mb-1 text-2xl font-bold">Record: {selectedTask?.title}</h1>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{selectedTask?.description}</p>

          {loadingModel && (
            <div className="mb-4 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              Loading pose detection model...
            </div>
          )}

          <div className="relative mb-4 w-full max-w-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-zinc-200 dark:bg-black"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute left-0 top-0 h-full w-full max-w-2xl rounded-lg"
            />
            {isRecording && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-medium">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Recording
              </div>
            )}
          </div>
          <label className="mb-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={faceBlurEnabled}
              onChange={(e) => setFaceBlurEnabled(e.target.checked)}
              disabled={isRecording}
              className="h-4 w-4 rounded border-zinc-400 bg-zinc-100 text-blue-500 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
            />
            <span>
              Blur my face in the recording
            </span>
          </label>
          {isRecording && (
            <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-500">
              {faceBlurEnabled
                ? 'Your face is blurred in this recording.'
                : 'Face blur is off for this recording.'}
            </p>
          )}

          {modelLoaded && currentKeypoints.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Live 3D Skeleton</h3>
              <PoseSkeletonViewer keypoints={currentKeypoints} width={400} height={300} />
            </div>
          )}

          <div className="flex gap-4">
        {!stream ? (
          <button
            onClick={startCamera}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Start Camera
          </button>
        ) : (
          <>
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!modelLoaded}
                className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {modelLoaded ? 'Start Recording' : 'Waiting for model...'}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="rounded-lg bg-red-700 px-6 py-3 font-medium text-white hover:bg-red-800"
              >
                Stop Recording
              </button>
            )}
            <button
              onClick={() => { stopCamera(); setPhase('select-task'); }}
              className="rounded-lg bg-zinc-700 px-6 py-3 font-medium text-white hover:bg-zinc-600"
            >
              Cancel
            </button>
          </>
        )}
          </div>
        </div>

        {/* Right: requirements (visible while recording) */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="sticky top-8 rounded-xl border border-zinc-200 bg-white/90 p-5 dark:border-zinc-800 dark:bg-zinc-900/90">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Task requirements
            </h2>
            <p className="mb-3 text-base font-medium text-zinc-900 dark:text-white">
              {selectedTask?.title}
            </p>
            {selectedTask?.description && (
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                {selectedTask.description}
              </p>
            )}
            {selectedTask?.requirements ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">Requirements:</span>
                <p className="mt-1 whitespace-pre-wrap">{selectedTask.requirements}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No specific requirements. Perform the task clearly and fully.
              </p>
            )}
            {(selectedTask?.pricePerApproval ?? 0) > 0 && (
              <p className="mt-4 text-xs font-medium text-green-400">
                ${(selectedTask?.pricePerApproval ?? 0).toFixed(2)} per approved video
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
