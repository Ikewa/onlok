import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderStatus = 'idle' | 'requesting' | 'ready' | 'recording' | 'stopped' | 'error';

export interface UseVideoRecorderReturn {
  status: RecorderStatus;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  duration: number;
  error: string | null;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  maxDuration: number;
  isSupported: boolean;
  getStream: () => MediaStream | null;
  startCamera: (deviceId?: string) => Promise<void>;
  startRecording: () => void;
  stopRecording: () => void;
  retake: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
}

const MAX_DURATION_SECONDS = 120; // 2 minutes

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);
  const durationRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const killStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    setStatus('requesting');
    setError(null);
    try {
      const videoConstraint = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: 'user' };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: true,
      });
      streamRef.current = stream;

      // Labels are only populated AFTER permission is granted
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(cameras);

      const activeDeviceId =
        deviceId ||
        stream.getVideoTracks()[0]?.getSettings().deviceId ||
        cameras[0]?.deviceId ||
        '';
      setSelectedDeviceId(activeDeviceId);
      setStatus('ready');
    } catch (err: any) {
      let message = 'Could not access the camera.';
      const name = (err?.name as string) || '';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        message = 'No camera was found on this device.';
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        message =
          'Camera permission was denied. Please allow camera and microphone access in your browser settings, then try again.';
      } else if (name === 'NotReadableError') {
        message =
          'Your camera is currently in use by another application. Close it and try again.';
      } else if (name === 'OverconstrainedError') {
        message = 'The selected camera could not be started. Please try a different one.';
      }
      setError(message);
      setStatus('error');
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    durationRef.current = 0;
    setDuration(0);

    // Pick the best supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      clearTimer();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      revokeObjectUrl();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setStatus('stopped');
      // Release the camera once recording is done
      killStream();
    };

    recorder.start(250); // Emit chunks every 250 ms
    setStatus('recording');

    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
      // Auto-stop at the max duration limit
      if (durationRef.current >= MAX_DURATION_SECONDS) {
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
      }
    }, 1000);
  }, [clearTimer, killStream, revokeObjectUrl]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    clearTimer();
  }, [clearTimer]);

  const retake = useCallback(() => {
    revokeObjectUrl();
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    durationRef.current = 0;
    setStatus('idle');
  }, [revokeObjectUrl]);

  const switchCamera = useCallback(
    async (deviceId: string) => {
      killStream();
      setSelectedDeviceId(deviceId);
      await startCamera(deviceId);
    },
    [killStream, startCamera],
  );

  const getStream = useCallback(() => streamRef.current, []);

  // Full cleanup when the hook's host component unmounts
  useEffect(() => {
    return () => {
      clearTimer();
      killStream();
      revokeObjectUrl();
    };
  }, [clearTimer, killStream, revokeObjectUrl]);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  return {
    status,
    recordedBlob,
    recordedUrl,
    duration,
    error,
    devices,
    selectedDeviceId,
    maxDuration: MAX_DURATION_SECONDS,
    isSupported,
    getStream,
    startCamera,
    startRecording,
    stopRecording,
    retake,
    switchCamera,
  };
}
