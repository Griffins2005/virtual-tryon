import type { Landmark, OverlayConfig } from '../types';
import type { HandLandmark } from '../hooks/useHandTracking';
import { HAND_LM } from '../hooks/useHandTracking';
import { getSVGImage, watchSVG, ringsSVG, necklaceSVG } from '../utils/AssetGenerator';
import { drawImageAnchored } from '../utils/PerspectiveWarper';

type AccessoryStyle = 'watch' | 'rings' | 'necklace';

const REGISTRY: Record<AccessoryStyle, (c: string) => string> = {
  watch:    watchSVG,
  rings:    ringsSVG,
  necklace: necklaceSVG,
};

export async function renderAccessory(
  ctx: CanvasRenderingContext2D,
  faceLandmarks: Landmark[],
  W: number,
  H: number,
  itemId: string,
  cfg: OverlayConfig,
  handLandmarks?: HandLandmark[][] | null
): Promise<void> {
  const style  = itemId as AccessoryStyle;
  const svgFn  = REGISTRY[style];
  if (!svgFn) return;

  const img = await getSVGImage(svgFn, cfg.color).catch(() => null);
  if (!img) return;

  ctx.save();
  ctx.globalAlpha = cfg.opacity;

  if (style === 'necklace') {
    drawNecklace(ctx, img, faceLandmarks, W, H, cfg);
  } else if (handLandmarks && handLandmarks.length > 0) {
    if (style === 'watch') {
      drawWatch(ctx, img, handLandmarks[0], W, H, cfg);
    } else if (style === 'rings') {
      drawRings(ctx, img, handLandmarks[0], W, H, cfg);
    }
  } else {
    // No hand detected — show floating prompt
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#c8ff00';
    ctx.font = '500 13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Show your hand to try on', W / 2, H - 40);
  }

  ctx.restore();
}

function drawWatch(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  hand: HandLandmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  const wrist  = hand[HAND_LM.WRIST];
  const imcp   = hand[HAND_LM.INDEX_MCP];
  const pmcp   = hand[HAND_LM.PINKY_MCP];
  if (!wrist || !imcp || !pmcp) return;

  const wx = wrist.x * W,  wy = wrist.y * H;
  const ix = imcp.x  * W,  iy = imcp.y  * H;
  const px = pmcp.x  * W,  py = pmcp.y  * H;

  const handWidth = Math.hypot(ix - px, iy - py);
  const watchW    = handWidth * 1.4  * cfg.scale;
  const watchH    = watchW   * 1.25;
  const angle     = Math.atan2(iy - wy, ix - wx) - Math.PI / 2;

  // Place watch at wrist — offset along forearm direction
  const forearmDx = wx - (ix + px) / 2;
  const forearmDy = wy - (iy + py) / 2;
  const fLen      = Math.hypot(forearmDx, forearmDy) || 1;
  const cx        = wx + (forearmDx / fLen) * watchH * 0.15 + cfg.offsetY * Math.cos(angle);
  const cy        = wy + (forearmDy / fLen) * watchH * 0.15 + cfg.offsetY * Math.sin(angle);

  drawImageAnchored(ctx, img, cx, cy, watchW, watchH, angle, cfg.opacity);
}

function drawRings(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  hand: HandLandmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  // Ring on index finger (between MCP and PIP)
  const mcp = hand[HAND_LM.INDEX_MCP];
  const pip = hand[HAND_LM.INDEX_PIP];
  if (!mcp || !pip) return;

  const cx    = ((mcp.x + pip.x) / 2) * W;
  const cy    = ((mcp.y + pip.y) / 2) * H + cfg.offsetY;
  const fDist = Math.hypot((pip.x - mcp.x) * W, (pip.y - mcp.y) * H);
  const size  = fDist * 1.8 * cfg.scale;
  const angle = Math.atan2((pip.y - mcp.y) * H, (pip.x - mcp.x) * W) - Math.PI / 2;

  drawImageAnchored(ctx, img, cx, cy, size, size, angle, cfg.opacity);
}

function drawNecklace(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  face: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  // Anchor to chin + neck region using face landmarks
  const chin  = face[152];
  const left  = face[234];
  const right = face[454];
  if (!chin || !left || !right) return;

  const faceW  = Math.hypot((right.x - left.x) * W, (right.y - left.y) * H);
  const cx     = chin.x * W;
  const cy     = chin.y * H + faceW * 0.45 + cfg.offsetY;
  const neckW  = faceW * 1.6  * cfg.scale;
  const neckH  = neckW * 1.25;
  const angle  = Math.atan2((right.y - left.y) * H, (right.x - left.x) * W);

  drawImageAnchored(ctx, img, cx, cy, neckW, neckH, angle, cfg.opacity);
}
