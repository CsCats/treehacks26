'use client';

import { useState, useRef, useEffect } from 'react';

export default function UserUpload() {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    mediaRecorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-2xl font-semibold">Upload Training Footage</h1>
      
      <div className="mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full max-w-2xl rounded-lg bg-black"
        />
      </div>

      <div className="flex gap-4">
        {!stream ? (
          <button
            onClick={startCamera}
            className="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
          >
            Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="rounded bg-gray-500 px-6 py-2 text-white hover:bg-gray-600"
            >
              Stop Camera
            </button>
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="rounded bg-red-500 px-6 py-2 text-white hover:bg-red-600"
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="rounded bg-red-600 px-6 py-2 text-white hover:bg-red-700"
              >
                Stop Recording
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
