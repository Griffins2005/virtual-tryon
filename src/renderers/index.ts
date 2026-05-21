import type { Landmark, OverlayConfig, TryOnMode } from '../types';
import type { PoseLandmark } from '../types/pose';
import type { HandLandmark } from '../hooks/useHandTracking';
import { renderGlasses }      from './glassesRenderer';
import { renderMakeup }       from './makeupRenderer';
import { renderClothingV3 }   from './clothingRendererV3';
import { renderAccessory }    from './accessoryRenderer';

export async function renderFrame(
  ctx: CanvasRenderingContext2D,
  faceLandmarks: Landmark[],
  W: number, H: number,
  mode: TryOnMode,
  itemId: string,
  cfg: OverlayConfig,
  poseLandmarks?: PoseLandmark[] | null,
  handLandmarks?: HandLandmark[][] | null
): Promise<void> {
  ctx.clearRect(0, 0, W, H);
  switch (mode) {
    case 'glasses':     renderGlasses(ctx, faceLandmarks, W, H, itemId, cfg); break;
    case 'makeup':      renderMakeup(ctx, faceLandmarks, W, H, itemId, cfg);  break;
    case 'clothing':    await renderClothingV3(ctx, faceLandmarks, W, H, itemId, cfg, poseLandmarks); break;
    case 'accessories': await renderAccessory(ctx, faceLandmarks, W, H, itemId, cfg, handLandmarks);  break;
  }
}
