/**
 * Mutable module-level store for the live camera elements.
 * CameraViewport writes these; HDTryOnPanel reads them.
 * Using a plain object (not React ref) because refs created outside components are read-only.
 */
export const cameraEls: {
  video:  HTMLVideoElement  | null;
  canvas: HTMLCanvasElement | null;
} = { video: null, canvas: null };
