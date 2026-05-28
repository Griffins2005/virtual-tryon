import { useEffect, useRef, useCallback } from 'react';
import {
  FilesetResolver,
  FaceLandmarker,
  PoseLandmarker,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import type { Landmark } from '../types';
import type { PoseLandmark } from '../types/pose';
import type { HandLandmark } from './useHandTracking';
import { useStore } from '../store/useStore';
import { LandmarkSmoother } from '../utils/LandmarkSmoother';

// Model assets — Tasks API bundles WASM + GPU delegate in one CDN path
const WASM   = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODELS = 'https://storage.googleapis.com/mediapipe-models';
const FACE_M = `${MODELS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`;
const POSE_M = `${MODELS}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`;
const HAND_M = `${MODELS}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`;

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
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);

  // Tasks API landmarker instances — all share the same WASM/GPU context
  const faceLM   = useRef<FaceLandmarker  | null>(null);
  const poseLM   = useRef<PoseLandmarker  | null>(null);
  const handLM   = useRef<HandLandmarker  | null>(null);

  const faceSmoother = useRef(new LandmarkSmoother(0.55));
  const poseSmoother = useRef(new LandmarkSmoother(0.60));

  const latestFace   = useRef<Landmark[]       | null>(null);
  const latestPose   = useRef<PoseLandmark[]   | null>(null);
  const latestHands  = useRef<HandLandmark[][] | null>(null);

  const fpsCount = useRef(0);
  const fpsTime  = useRef(0);
  const frameIdx = useRef(0);
  // Track last timestamp sent to detectForVideo — Tasks API requires strictly increasing values
  const lastFaceTs = useRef(-1);
  const lastPoseTs = useRef(-1);
  const lastHandTs = useRef(-1);

  const { setDetection, setCameraActive, mode } = useStore();

  // Keep a ref to onResults so the RAF loop always calls the latest version
  // without needing to restart when mode / selectedItem / config change.
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults; // sync every render, no effect needed

  // emit is stable — it reads the latest callback via ref
  const emit = useCallback(() => {
    const W = canvasRef.current?.width  ?? 640;
    const H = canvasRef.current?.height ?? 480;
    onResultsRef.current({
      faceLandmarks: latestFace.current,
      poseLandmarks: latestPose.current,
      handLandmarks: latestHands.current,
      W, H,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — reads latest via onResultsRef

  // ── Main rAF loop ──────────────────────────────────────────────────────────
  const startLoop = useCallback((video: HTMLVideoElement) => {
    const loop = () => {
      if (!faceLM.current) return; // landmarkers not ready yet (shouldn't happen but be safe)

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const ts = performance.now();
      frameIdx.current++;

      // ── Face (every frame) ────────────────────────────────────────────────
      if (ts > lastFaceTs.current) {
        lastFaceTs.current = ts;
        try {
          const fr   = faceLM.current.detectForVideo(video, ts);
          const raw0 = fr.faceLandmarks?.[0];

          if (raw0?.length) {
            const raw = raw0.map(p => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
            latestFace.current = faceSmoother.current.smooth(raw);

            // FPS accounting
            fpsCount.current++;
            const now = Date.now();
            if (!fpsTime.current) fpsTime.current = now;
            if (now - fpsTime.current >= 1000) {
              setDetection({ fps: Math.round(fpsCount.current * 1000 / (now - fpsTime.current)) });
              fpsCount.current = 0;
              fpsTime.current  = now;
            }

            setDetection({ detected: true, landmarks: latestFace.current });
          } else {
            latestFace.current = null;
            setDetection({ detected: false, landmarks: null });
          }
        } catch {
          latestFace.current = null;
        }
      }

      // ── Pose (even frames) ────────────────────────────────────────────────
      if (frameIdx.current % 2 === 0 && ts > lastPoseTs.current) {
        lastPoseTs.current = ts;
        try {
          const pr   = poseLM.current!.detectForVideo(video, ts);
          const raw0 = pr.landmarks?.[0];
          if (raw0?.length) {
            latestPose.current = poseSmoother.current.smooth(
              raw0.map(p => ({ x: p.x, y: p.y, z: p.z ?? 0, visibility: p.visibility ?? 1 }))
            ) as PoseLandmark[];
          } else {
            latestPose.current = null;
          }
        } catch {
          latestPose.current = null;
        }
      }

      // ── Hands (odd frames) ────────────────────────────────────────────────
      if (frameIdx.current % 2 === 1 && ts > lastHandTs.current) {
        lastHandTs.current = ts;
        try {
          const hr = handLM.current!.detectForVideo(video, ts);
          latestHands.current = hr.landmarks?.length
            ? hr.landmarks.map(h => h.map(p => ({ x: p.x, y: p.y, z: p.z ?? 0 })))
            : null;
        } catch {
          latestHands.current = null;
        }
      }

      emit();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [emit, setDetection]);

  // ── Camera start ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async (): Promise<string | null> => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return 'Camera or rendering surface unavailable.';
    if (!navigator.mediaDevices?.getUserMedia) return 'Camera API not supported by this browser.';

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      video.srcObject   = stream;
      await video.play();

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      setCameraActive(true);

      // Load WASM + GPU delegate once, create all three landmarkers in parallel
      const vision = await FilesetResolver.forVisionTasks(WASM);

      const [face, pose, hand] = await Promise.all([
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_M, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence:  0.5,
          minTrackingConfidence:      0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_M, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence:  0.5,
          minTrackingConfidence:      0.5,
          outputSegmentationMasks: false,
        }),
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_M, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence:  0.5,
          minTrackingConfidence:      0.5,
        }),
      ]);

      faceLM.current = face;
      poseLM.current = pose;
      handLM.current = hand;

      // Reset timestamps so the loop doesn't skip the first frame
      lastFaceTs.current = -1;
      lastPoseTs.current = -1;
      lastHandTs.current = -1;

      startLoop(video);
      return null;
    } catch (err) {
      stream?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraActive(false);
      return `Failed to start camera: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [setCameraActive, startLoop]);

  // ── Camera stop ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    // Cleanly close GPU resources
    faceLM.current?.close(); faceLM.current = null;
    poseLM.current?.close(); poseLM.current = null;
    handLM.current?.close(); handLM.current = null;

    latestFace.current  = null;
    latestPose.current  = null;
    latestHands.current = null;
    faceSmoother.current.reset();
    poseSmoother.current.reset();

    setCameraActive(false);
    setDetection({ detected: false, landmarks: null, fps: 0 });

    canvasRef.current?.getContext('2d')
      ?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [setCameraActive, setDetection]);

  // Reset smoothers on mode change (new tracking context)
  useEffect(() => {
    faceSmoother.current.reset();
    poseSmoother.current.reset();
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, canvasRef, startCamera, stopCamera };
}
