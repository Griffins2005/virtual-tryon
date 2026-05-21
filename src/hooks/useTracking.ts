import { useEffect, useRef, useCallback } from 'react';
import type { Landmark } from '../types';
import type { PoseLandmark } from '../types/pose';
import type { HandLandmark } from './useHandTracking';
import { useStore } from '../store/useStore';
import { LandmarkSmoother } from '../utils/LandmarkSmoother';

export interface TrackingResults {
  faceLandmarks:  Landmark[]       | null;
  poseLandmarks:  PoseLandmark[]   | null;
  handLandmarks:  HandLandmark[][] | null;
  W: number; H: number;
}

interface UseTrackingReturn {
  videoRef:    React.RefObject<HTMLVideoElement | null>;
  canvasRef:   React.RefObject<HTMLCanvasElement | null>;
  startCamera: () => Promise<string | null>;
  stopCamera:  () => void;
}

export function useTracking(onResults: (r: TrackingResults) => void): UseTrackingReturn {
  const videoRef    = useRef<HTMLVideoElement | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const faceRef     = useRef<unknown>(null);
  const poseRef     = useRef<unknown>(null);
  const handsRef    = useRef<unknown>(null);
  const camRef      = useRef<unknown>(null);
  const faceSmoother = useRef(new LandmarkSmoother(0.55));
  const poseSmoother = useRef(new LandmarkSmoother(0.60));
  const latestFace  = useRef<Landmark[] | null>(null);
  const latestPose  = useRef<PoseLandmark[] | null>(null);
  const latestHands = useRef<HandLandmark[][] | null>(null);
  const fpsCount    = useRef(0);
  const fpsTime     = useRef(0);
  const { setDetection, setCameraActive, mode } = useStore();

  const emit = useCallback(() => {
    const W = canvasRef.current?.width  ?? 640;
    const H = canvasRef.current?.height ?? 480;
    onResults({ faceLandmarks: latestFace.current, poseLandmarks: latestPose.current, handLandmarks: latestHands.current, W, H });
  }, [onResults]);

  const handleFace = useCallback((r: { multiFaceLandmarks?: { x:number;y:number;z?:number }[][] }) => {
    fpsCount.current++;
    const now = Date.now();
    if (!fpsTime.current) fpsTime.current = now;
    if (now - fpsTime.current >= 1000) {
      setDetection({ fps: Math.round(fpsCount.current * 1000 / (now - fpsTime.current)) });
      fpsCount.current = 0; fpsTime.current = now;
    }
    if (r.multiFaceLandmarks?.length) {
      const raw = r.multiFaceLandmarks[0].map(p => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
      latestFace.current = faceSmoother.current.smooth(raw);
      setDetection({ detected: true, landmarks: latestFace.current });
    } else {
      latestFace.current = null;
      setDetection({ detected: false, landmarks: null });
    }
    emit();
  }, [setDetection, emit]);

  const handlePose = useCallback((r: { poseLandmarks?: { x:number;y:number;z:number;visibility?:number }[] }) => {
    if (r.poseLandmarks?.length) {
      latestPose.current = poseSmoother.current.smooth(r.poseLandmarks) as PoseLandmark[];
    } else {
      latestPose.current = null;
    }
    emit();
  }, [emit]);

  const handleHands = useCallback((r: {
    multiHandLandmarks?:  { x:number;y:number;z:number }[][];
    multiHandedness?:     { classification: { label:string;score:number }[] }[];
  }) => {
    latestHands.current = r.multiHandLandmarks?.length
      ? r.multiHandLandmarks.map(h => h.map(p => ({ x: p.x, y: p.y, z: p.z })))
      : null;
    emit();
  }, [emit]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = useCallback(async () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return 'Camera or rendering surface unavailable.';
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('Camera API not supported by this browser.');
      return 'Camera API not supported by this browser.';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      setCameraActive(true);

      const [FaceMeshModRaw, PoseModRaw, HandsModRaw, CameraModRaw] = await Promise.all([
        import('@mediapipe/face_mesh'),
        import('@mediapipe/pose'),
        import('@mediapipe/hands'),
        import('@mediapipe/camera_utils'),
      ]);

      const FaceMeshMod = (FaceMeshModRaw as any).default ?? FaceMeshModRaw;
      const PoseMod = (PoseModRaw as any).default ?? PoseModRaw;
      const HandsMod = (HandsModRaw as any).default ?? HandsModRaw;
      const CameraMod = (CameraModRaw as any).default ?? CameraModRaw;
      const globalScope = typeof self !== 'undefined' ? self as any : typeof window !== 'undefined' ? window as any : globalThis as any;

      const resolveCtor = (module: any, exportName: string, globalName: string) => {
        if (module && typeof module[exportName] === 'function') return module[exportName];
        if (typeof module === 'function') return module;
        if (globalScope && typeof globalScope[globalName] === 'function') return globalScope[globalName];
        throw new Error(`Missing constructor for ${exportName}`);
      };

      const FaceMeshCtor = resolveCtor(FaceMeshMod, 'FaceMesh', 'FaceMesh');
      const PoseCtor = resolveCtor(PoseMod, 'Pose', 'Pose');
      const HandsCtor = resolveCtor(HandsMod, 'Hands', 'Hands');
      const CameraCtor = resolveCtor(CameraMod, 'Camera', 'Camera');

      const faceMesh = new FaceMeshCtor({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMesh.onResults((r: Parameters<typeof handleFace>[0]) => handleFace(r));
      faceRef.current = faceMesh;

      const pose = new PoseCtor({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      pose.onResults((r: Parameters<typeof handlePose>[0]) => handlePose(r));
      poseRef.current = pose;

      const hands = new HandsCtor({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
      hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (hands as any).onResults((r: unknown) => handleHands(r as Parameters<typeof handleHands>[0]));
      handsRef.current = hands;

      type Sendable = { send: (o: { image: HTMLVideoElement }) => Promise<void> };
      let fi = 0;
      const cam = new CameraCtor(video, {
        onFrame: async () => {
          fi++;
          await (faceMesh as Sendable).send({ image: video });
          if (fi % 2 === 0) await (pose  as Sendable).send({ image: video });
          if (fi % 2 === 1) await (hands as Sendable).send({ image: video });
        },
        width: 640, height: 480,
      });
      cam.start(); camRef.current = cam;
      return null;
    } catch (err) {
      console.error('Tracking init failed:', err);
      stopStream();
      setCameraActive(false);
      const message = err instanceof Error ? err.message : String(err);
      return `Failed to start camera: ${message}`;
    }
  }, [handleFace, handlePose, handleHands, setCameraActive]);

  const stopCamera = useCallback(() => {
    (camRef.current as { stop?: () => void })?.stop?.();
    camRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    latestFace.current = null; latestPose.current = null; latestHands.current = null;
    faceSmoother.current.reset(); poseSmoother.current.reset();
    setCameraActive(false); setDetection({ detected: false, landmarks: null, fps: 0 });
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [setCameraActive, setDetection]);

  useEffect(() => { faceSmoother.current.reset(); poseSmoother.current.reset(); }, [mode]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, canvasRef, startCamera, stopCamera };
}
