import type { Landmark } from '../types';

export interface SkinTone {
  r: number;
  g: number;
  b: number;
  luminance: number; // 0–255 weighted
  label: 'fair' | 'light' | 'medium' | 'tan' | 'dark' | 'deep';
}

let _cached: SkinTone | null = null;
let _lastSampleMs = 0;

export function getSkinTone(): SkinTone | null {
  return _cached;
}

export function resetSkinTone(): void {
  _cached = null;
  _lastSampleMs = 0;
}

/**
 * Sample skin tone from cheek + forehead patches on a mirrored video frame.
 * Only fires at most once every `intervalMs` ms (default 10 s) to keep cost low.
 */
export function sampleSkinTone(
  video: HTMLVideoElement,
  lm: Landmark[],
  W: number,
  H: number,
  intervalMs = 10_000,
): void {
  const now = performance.now();
  if (now - _lastSampleMs < intervalMs) return;
  _lastSampleMs = now;

  // MediaPipe cheek + forehead landmarks
  const cheekL = lm[50];
  const cheekR = lm[280];
  const fore   = lm[151];
  if (!cheekL && !cheekR) return;

  try {
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const ctx = tmp.getContext('2d')!;
    // Mirror to match the live canvas (CSS scaleX(-1) transform on the video)
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -W, 0, W, H); ctx.restore();

    let totalR = 0, totalG = 0, totalB = 0, count = 0;
    const r = Math.max(5, Math.round(W * 0.025));

    const samplePatch = (pt: Landmark) => {
      const px = Math.round(pt.x * W);
      const py = Math.round(pt.y * H);
      const x0 = Math.max(0, px - r); const y0 = Math.max(0, py - r);
      const sw = Math.min(r * 2, W - x0); const sh = Math.min(r * 2, H - y0);
      if (sw <= 0 || sh <= 0) return;
      const data = ctx.getImageData(x0, y0, sw, sh).data;
      for (let i = 0; i < data.length; i += 4) {
        totalR += data[i]; totalG += data[i + 1]; totalB += data[i + 2]; count++;
      }
    };

    if (cheekL) samplePatch(cheekL);
    if (cheekR) samplePatch(cheekR);
    if (fore)   samplePatch(fore);
    if (count === 0) return;

    const avgR = totalR / count;
    const avgG = totalG / count;
    const avgB = totalB / count;
    const lum  = 0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB;

    _cached = {
      r: avgR, g: avgG, b: avgB, luminance: lum,
      label:
        lum > 190 ? 'fair'   :
        lum > 158 ? 'light'  :
        lum > 125 ? 'medium' :
        lum >  92 ? 'tan'    :
        lum >  58 ? 'dark'   : 'deep',
    };
  } catch {
    // SecurityError from CORS, tainted canvas, etc. — ignore silently
  }
}

/**
 * Scale factor (0–1) for multiply/darken operations.
 * Dark skin absorbs more light so multiply looks too harsh; reduce strength.
 */
export function darkenScale(): number {
  const st = _cached;
  if (!st) return 1.0;
  // L=145 → full strength; L=50 → 0.45x
  return Math.max(0.45, Math.min(1.0, st.luminance / 145));
}

/**
 * Scale factor (0.65–1.35) for screen/lighten operations.
 * Light skin blows out on screen; dark skin needs more boost.
 */
export function screenScale(): number {
  const st = _cached;
  if (!st) return 1.0;
  // L=200 → 0.70x (light skin, reduce glow); L=60 → 1.30x (dark skin, boost)
  return Math.max(0.70, Math.min(1.30, (220 - st.luminance) / 145));
}
