import type { Landmark, OverlayConfig } from '../types';
import type { PoseLandmark, BodyGeometry } from '../types/pose';
import { extractBodyGeometry } from '../types/pose';
import { CLOTHING_SVG, getSVGImage } from '../utils/AssetGenerator';
import { warpImageOntoQuad } from '../utils/PerspectiveWarper';

type ClothingStyle = 'tshirt' | 'hoodie' | 'jacket' | 'dress';


export async function renderClothingV3(
  ctx: CanvasRenderingContext2D,
  faceLandmarks: Landmark[],
  W: number, H: number,
  itemId: string,
  cfg: OverlayConfig,
  poseLandmarks?: PoseLandmark[] | null
): Promise<void> {
  const style = itemId as ClothingStyle;
  const svgFn = CLOTHING_SVG[style];
  if (!svgFn) return;

  const img = await getSVGImage(svgFn, cfg.color).catch(() => null);
  if (!img) return;

  ctx.save();

  const geo = poseLandmarks ? extractBodyGeometry(poseLandmarks, W, H) : null;

  if (geo) {
    placeFromPose(ctx, img, style, geo, cfg);
  } else {
    placeFromFace(ctx, img, style, faceLandmarks, W, H, cfg);
  }

  ctx.restore();
}

function placeFromPose(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  style: ClothingStyle,
  geo: BodyGeometry,
  cfg: OverlayConfig
) {
  const scale = cfg.scale;
  const sw    = geo.shoulderWidth  * scale;
  const smx   = geo.shoulderMidX;
  const smy   = geo.shoulderMidY + cfg.offsetY;

  // Raw shoulder angle can be ~π when LM11/LM12 appear swapped in the canvas
  // coordinate system (front camera without pre-mirroring). Clamp to [-π/2, π/2]
  // so the garment always renders right-side up.
  let ang = geo.shoulderAngle;
  if (ang >  Math.PI / 2) ang -= Math.PI;
  if (ang < -Math.PI / 2) ang += Math.PI;

  // Use actual torso height from pose (shoulder→hip) for accurate hem placement
  // Add small padding below hips for natural hem fall
  const torsoH = geo.torsoHeight * scale;
  const hemExtraFactor = style === 'dress' ? 1.55 : 1.12;
  const hemY    = torsoH * hemExtraFactor;
  const imgW    = sw * 1.28;

  const cos = Math.cos(ang); const sin = Math.sin(ang);
  function rot(dx: number, dy: number) {
    return { x: smx + dx * cos - dy * sin, y: smy + dx * sin + dy * cos };
  }

  const dstTL = rot(-imgW / 2, -sw * 0.05);
  const dstTR = rot( imgW / 2, -sw * 0.05);

  let dstBL: {x:number;y:number};
  let dstBR: {x:number;y:number};

  if (style === 'dress') {
    // Dress flares below hips
    const flare = sw * 0.28;
    dstBL = rot(-imgW / 2 - flare, hemY);
    dstBR = rot( imgW / 2 + flare, hemY);
  } else {
    dstBL = rot(-imgW * 0.50, hemY);
    dstBR = rot( imgW * 0.50, hemY);
  }

  warpImageOntoQuad(ctx, img, dstTL, dstTR, dstBR, dstBL, cfg.opacity);
}

function placeFromFace(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  style: ClothingStyle,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  // Face-based fallback: infer body from face proportions
  const lt   = lm[127] ?? { x: 0.25, y: 0.45 };
  const rt   = lm[356] ?? { x: 0.75, y: 0.45 };
  const chin = lm[152] ?? { x: 0.50, y: 0.70 };
  const fore = lm[10]  ?? { x: 0.50, y: 0.30 };
  const le   = lm[234];  // ear
  const re   = lm[454];

  const lsx = lt.x * W;  const rsx = rt.x * W;
  const lsy = lt.y * H;  const rsy = rt.y * H;

  // Use ear-to-ear for better shoulder width estimate when available
  let sw: number;
  if (le && re) {
    const faceW = Math.hypot((re.x - le.x) * W, (re.y - le.y) * H);
    // Shoulders are roughly 1.5-1.7× face width
    sw = faceW * 1.60 * cfg.scale;
  } else {
    sw = Math.hypot(rsx - lsx, rsy - lsy) * 1.15 * cfg.scale;
  }

  const smx  = (lsx + rsx) / 2;
  const faceH = Math.abs((chin.y - fore.y) * H);
  // Shoulder sits just below chin
  const smy  = chin.y * H + faceH * 0.42 + cfg.offsetY;

  let ang = Math.atan2(rsy - lsy, rsx - lsx);
  if (ang >  Math.PI / 2) ang -= Math.PI;
  if (ang < -Math.PI / 2) ang += Math.PI;

  // Torso ≈ 1.9× face height
  const torsoH = faceH * 1.9 * cfg.scale;
  const hemFactor = style === 'dress' ? 1.55 : 1.10;
  const hemY  = torsoH * hemFactor;
  const imgW  = sw * 1.28;

  const cos = Math.cos(ang); const sin = Math.sin(ang);
  function rot(dx: number, dy: number) {
    return { x: smx + dx * cos - dy * sin, y: smy + dx * sin + dy * cos };
  }

  const dstTL = rot(-imgW / 2, 0);
  const dstTR = rot( imgW / 2, 0);
  const flare = style === 'dress' ? imgW * 0.28 : 0;
  const dstBL = rot(-imgW / 2 - flare, hemY);
  const dstBR = rot( imgW / 2 + flare, hemY);

  warpImageOntoQuad(ctx, img, dstTL, dstTR, dstBR, dstBL, cfg.opacity);
}
