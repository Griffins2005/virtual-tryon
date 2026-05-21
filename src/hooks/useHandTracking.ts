import { useRef, useCallback } from 'react';

export interface HandLandmark {
  x: number; y: number; z: number;
}

export interface HandResults {
  landmarks: HandLandmark[][];
  handedness: { label: string; score: number }[][];
}

/** MediaPipe Hands landmark indices */
export const HAND_LM = {
  WRIST:         0,
  THUMB_CMC:     1,  THUMB_MCP: 2,  THUMB_IP: 3,  THUMB_TIP: 4,
  INDEX_MCP:     5,  INDEX_PIP: 6,  INDEX_DIP: 7,  INDEX_TIP: 8,
  MIDDLE_MCP:    9,  MIDDLE_PIP:10, MIDDLE_DIP:11, MIDDLE_TIP:12,
  RING_MCP:     13,  RING_PIP:  14, RING_DIP:  15, RING_TIP:  16,
  PINKY_MCP:    17,  PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

type HandCallback = (results: HandResults) => void;

export function useHandTracking() {
  const handsRef = useRef<unknown>(null);
  const onResultsRef = useRef<HandCallback | null>(null);

  const init = useCallback(async (video: HTMLVideoElement) => {
    const { Hands } = await import('@mediapipe/hands');

    const hands = new Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });

    hands.setOptions({
      maxNumHands:            2,
      modelComplexity:        1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence:  0.5,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (hands as any).onResults((r: {
      multiHandLandmarks?: { x: number; y: number; z: number }[][];
      multiHandedness?: { classification: { label: string; score: number }[] }[];
    }) => {
      if (!onResultsRef.current) return;
      onResultsRef.current({
        landmarks:  (r.multiHandLandmarks ?? []).map(h => h.map(p => ({ x: p.x, y: p.y, z: p.z }))),
        handedness: (r.multiHandedness   ?? []).map(h => h.classification),
      });
    });

    handsRef.current = hands;

    return async () => {
      await (hands as { send: (o: { image: HTMLVideoElement }) => Promise<void> }).send({ image: video });
    };
  }, []);

  const setCallback = useCallback((cb: HandCallback) => {
    onResultsRef.current = cb;
  }, []);

  const send = useCallback(async (video: HTMLVideoElement) => {
    if (!handsRef.current) return;
    await (handsRef.current as { send: (o: { image: HTMLVideoElement }) => Promise<void> }).send({ image: video });
  }, []);

  return { init, setCallback, send };
}
