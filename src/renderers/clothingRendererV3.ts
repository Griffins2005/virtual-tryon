import type { Landmark, OverlayConfig } from '../types';
import type { PoseLandmark, BodyGeometry } from '../types/pose';
import { extractBodyGeometry } from '../types/pose';
import { CLOTHING_SVG, getSVGImage } from '../utils/AssetGenerator';
import { warpImageOntoQuad } from '../utils/PerspectiveWarper';

type ClothingStyle = 'tshirt' | 'hoodie' | 'jacket' | 'dress';

// Anchor points in the SVG image (0-1 normalized)
// These map the "shoulder seam" and "hem" of each garment in its SVG coordinate space
const ANCHORS: Record<ClothingStyle, {
  tl: {x:number;y:number}; tr: {x:number;y:number};  // top-left, top-right (shoulder line)
  bl: {x:number;y:number}; br: {x:number;y:number};  // bottom-left, bottom-right (hem)
}> = {
  tshirt:  { tl:{x:0.18,y:0.16}, tr:{x:0.82,y:0.16}, bl:{x:0.14,y:0.89}, br:{x:0.86,y:0.89} },
  hoodie:  { tl:{x:0.18,y:0.19}, tr:{x:0.82,y:0.19}, bl:{x:0.14,y:0.90}, br:{x:0.86,y:0.90} },
  jacket:  { tl:{x:0.17,y:0.17}, tr:{x:0.83,y:0.17}, bl:{x:0.14,y:0.90}, br:{x:0.86,y:0.90} },
  dress:   { tl:{x:0.28,y:0.13}, tr:{x:0.72,y:0.13}, bl:{x:0.08,y:0.98}, br:{x:0.92,y:0.98} },
};

export async function renderClothingV3(
  ctx: CanvasRenderingContext2D,
  faceLandmarks: Landmark[],
  W: number,
  H: number,
  itemId: string,
  cfg: OverlayConfig,
  poseLandmarks?: PoseLandmark[] | null
): Promise<void> {
  const style  = itemId as ClothingStyle;
  const svgFn  = CLOTHING_SVG[style];
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
  const torso = geo.torsoHeight    * scale;
  const smx   = geo.shoulderMidX;
  const smy   = geo.shoulderMidY + cfg.offsetY;
  const ang   = geo.shoulderAngle;

  // Build 4 destination corners in world space from the rotated body frame
  const cos = Math.cos(ang), sin = Math.sin(ang);
  function rotated(dx: number, dy: number) {
    return { x: smx + dx * cos - dy * sin, y: smy + dx * sin + dy * cos };
  }

  const hemY    = torso * 1.1;
  const shoulderPad = sw * 0.08; // slight extra width at shoulder

  const anchors = ANCHORS[style];

  // Map the image anchors to canvas coords
  // The image covers shoulder-to-hem with some extra width
  const imgW = sw * 1.25;
  // imgH not needed

  // Map four corners of the garment image to body coordinates
  const dstTL = rotated(-imgW / 2 + (0.5 - anchors.tl.x) * imgW * 0.3, -shoulderPad);
  const dstTR = rotated( imgW / 2 - (anchors.tr.x - 0.5) * imgW * 0.3, -shoulderPad);
  const dstBL = rotated(-imgW * 0.52, hemY);
  const dstBR = rotated( imgW * 0.52, hemY);

  // Adjust for dress flare
  if (style === 'dress') {
    dstBL.x -= sw * 0.18; dstBR.x += sw * 0.18;
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
  const lt   = lm[127] ?? { x: 0.25, y: 0.45 };
  const rt   = lm[356] ?? { x: 0.75, y: 0.45 };
  const chin = lm[152] ?? { x: 0.50, y: 0.70 };
  const fore = lm[10]  ?? { x: 0.50, y: 0.30 };

  const lsx  = lt.x * W;  const rsx  = rt.x * W;
  const lsy  = lt.y * H;  const rsy  = rt.y * H;
  const smx  = (lsx + rsx) / 2;
  const faceH = Math.abs((chin.y - fore.y) * H);
  const smy  = chin.y * H + faceH * 0.5 + cfg.offsetY;
  const ang  = Math.atan2(rsy - lsy, rsx - lsx);

  const sw    = Math.hypot(rsx - lsx, rsy - lsy) * cfg.scale;
  const torso = faceH * cfg.scale * 2.0;
  const cos   = Math.cos(ang), sin = Math.sin(ang);

  function rotated(dx: number, dy: number) {
    return { x: smx + dx * cos - dy * sin, y: smy + dx * sin + dy * cos };
  }

  const hemY = torso * 1.1;
  const imgW  = sw * 1.3;

  const dstTL = rotated(-imgW / 2, 0);
  const dstTR = rotated( imgW / 2, 0);
  const dstBL = rotated(style === 'dress' ? -imgW * 0.7 : -imgW / 2, hemY);
  const dstBR = rotated(style === 'dress' ?  imgW * 0.7 :  imgW / 2, hemY);

  warpImageOntoQuad(ctx, img, dstTL, dstTR, dstBR, dstBL, cfg.opacity);
}
