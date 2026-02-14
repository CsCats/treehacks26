'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const PoseSkeletonViewer = dynamic(() => import('@/components/PoseSkeletonViewer'), {
  ssr: false,
  loading: () => <div className="w-[500px] h-[400px] bg-zinc-900 rounded-lg animate-pulse" />,
});

interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string;
  businessId: string;
  businessName: string;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<PoseFrame[]>([]);

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

  const loadPoseModel = useCallback(async () => {
    if (detectorRef.current || loadingModel) return;
    setLoadingModel(true);
    try {
      // Load TensorFlow.js and pose-detection via CDN to avoid Turbopack/SSR issues
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection');

      const tf = window.tf;
      const poseDetection = window.poseDetection;

      await tf.ready();

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
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

  const drawKeypoints = useCallback(
    (keypoints: Keypoint[], ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      const connections: [number, number][] = [
        [0, 1], [0, 2], [1, 3], [2, 4],
        [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
        [5, 11], [6, 12], [11, 12],
        [11, 13], [13, 15], [12, 14], [14, 16],
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        setCurrentKeypoints(keypoints);
        drawKeypoints(keypoints, ctx, canvas.width, canvas.height);

        if (mediaRecorderRef.current?.state === 'recording') {
          framesRef.current.push({
            timestamp: Date.now(),
            keypoints: keypoints.map((kp: Keypoint) => ({
              x: kp.x,
              y: kp.y,
              z: kp.z,
              score: kp.score,
              name: kp.name,
            })),
          });
        }
      }
    } catch (error) {
      console.error('Pose detection error:', error);
    }

    animFrameRef.current = requestAnimationFrame(detectPose);
  }, [drawKeypoints]);

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
    if (!stream) return;
    chunksRef.current = [];
    framesRef.current = [];

    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
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
    if (!recordedBlob || !selectedTask) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', recordedBlob, 'recording.webm');
      formData.append('poseData', JSON.stringify(recordedFrames));
      formData.append('taskId', selectedTask.id);
      formData.append('businessId', selectedTask.businessId || '');

      const res = await fetch('/api/submissions', { method: 'POST', body: formData });
      if (res.ok) {
        setUploadSuccess(true);
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
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
      <div className="flex min-h-screen flex-col items-center bg-zinc-950 p-8 text-white">
        <a href="/" className="mb-6 text-sm text-zinc-500 hover:text-zinc-300 self-start">
          ← Back to Home
        </a>
        <h1 className="mb-2 text-3xl font-bold">Upload Training Footage</h1>
        <p className="mb-8 text-zinc-400">Select a task to contribute training data for</p>

        {tasks.length === 0 ? (
          <div className="text-zinc-500">
            No tasks available yet. Businesses need to create tasks first.
          </div>
        ) : (
          <div className="grid w-full max-w-3xl gap-4">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setPhase('camera');
                  setTimeout(() => startCamera(), 100);
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-left transition hover:border-zinc-600 hover:bg-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                  {task.businessName && (
                    <span className="rounded-full bg-purple-600/20 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                      {task.businessName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-400">{task.description}</p>
                {task.requirements && (
                  <p className="mt-2 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">Requirements:</span> {task.requirements}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-600">
                  {task.submissionCount || 0} submissions
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review') {
    if (uploadSuccess) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8 text-white">
          <div className="text-center">
            <div className="mb-4 text-5xl">✓</div>
            <h2 className="mb-2 text-2xl font-bold text-green-400">Upload Successful!</h2>
            <p className="mb-6 text-zinc-400">
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
      <div className="flex min-h-screen flex-col items-center bg-zinc-950 p-8 text-white">
        <h1 className="mb-2 text-2xl font-bold">Review Your Recording</h1>
        <p className="mb-6 text-zinc-400">
          Task: <span className="text-white">{selectedTask?.title}</span>
        </p>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Recorded Video</h3>
            {recordedBlobUrl && (
              <video
                src={recordedBlobUrl}
                controls
                className="w-[500px] rounded-lg bg-black"
              />
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-zinc-400">3D Pose Preview</h3>
            <PoseSkeletonViewer
              keypoints={
                recordedFrames.length > 0
                  ? recordedFrames[Math.floor(recordedFrames.length / 2)].keypoints
                  : []
              }
              width={500}
              height={400}
            />
            <p className="mt-2 text-xs text-zinc-500">
              {recordedFrames.length} pose frames captured • Drag to rotate
            </p>
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
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 p-8 text-white">
      <button
        onClick={() => { stopCamera(); setPhase('select-task'); }}
        className="mb-6 text-sm text-zinc-500 hover:text-zinc-300 self-start"
      >
        ← Back to Tasks
      </button>

      <h1 className="mb-1 text-2xl font-bold">Record: {selectedTask?.title}</h1>
      <p className="mb-6 text-sm text-zinc-400">{selectedTask?.description}</p>

      {loadingModel && (
        <div className="mb-4 rounded-lg bg-yellow-900/30 px-4 py-2 text-sm text-yellow-300">
          Loading pose detection model...
        </div>
      )}

      <div className="relative mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full max-w-2xl rounded-lg bg-black"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
        />
        {isRecording && (
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-medium">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Recording
          </div>
        )}
      </div>

      {modelLoaded && currentKeypoints.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-400">Live 3D Skeleton</h3>
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
  );
}
