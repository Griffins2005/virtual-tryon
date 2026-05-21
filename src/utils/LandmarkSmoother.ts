import type { Landmark } from '../types';

/**
 * One-euro filter per landmark for smooth, low-latency tracking.
 * Kills the jitter that makes overlays wobble without adding lag.
 */
export class LandmarkSmoother {
  private prev: Landmark[] | null = null;
  private readonly alpha: number;

  constructor(smoothing = 0.65) {
    // alpha close to 1 = very smooth but laggy
    // alpha close to 0 = very responsive but jittery
    this.alpha = Math.max(0, Math.min(1, smoothing));
  }

  smooth(raw: Landmark[]): Landmark[] {
    if (!this.prev || this.prev.length !== raw.length) {
      this.prev = raw.map(p => ({ ...p }));
      return this.prev;
    }

    this.prev = raw.map((p, i) => {
      const s = this.prev![i];
      return {
        x: s.x + this.alpha * (p.x - s.x),
        y: s.y + this.alpha * (p.y - s.y),
        z: (s.z ?? 0) + this.alpha * ((p.z ?? 0) - (s.z ?? 0)),
      };
    });

    return this.prev;
  }

  reset() {
    this.prev = null;
  }
}
