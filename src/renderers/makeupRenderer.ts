import type { Landmark, OverlayConfig } from '../types';

// Key landmark indices for makeup regions
const LM = {
  // Lips outer ring (clockwise from left corner)
  LIP_OUTER: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
  // Lips inner ring  
  LIP_INNER: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  // Left eye region
  LEFT_EYE:  [33, 160, 158, 133, 153, 144],
  // Right eye region
  RIGHT_EYE: [362, 385, 387, 263, 373, 380],
  // Left eyebrow
  LEFT_BROW:  [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  // Right eyebrow
  RIGHT_BROW: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
  // Left cheek
  LEFT_CHEEK:  [50, 101, 118, 117, 111, 36],
  // Right cheek
  RIGHT_CHEEK: [280, 330, 348, 347, 340, 266],
  // Face silhouette for contour
  FACE_LEFT:   [234, 93, 132, 58, 172],
  FACE_RIGHT:  [454, 323, 361, 288, 397],
  NOSE_TIP:    1,
  LEFT_EYE_CENTER:  159,
  RIGHT_EYE_CENTER: 386,
  FACE_TOP:    10,
  FACE_BOTTOM: 152,
};

function lmPx(lm: Landmark[], idx: number, W: number, H: number): [number, number] {
  const p = lm[idx];
  return p ? [p.x * W, p.y * H] : [0, 0];
}

function pathFromIndices(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  indices: number[],
  W: number,
  H: number
) {
  ctx.beginPath();
  indices.forEach((idx, i) => {
    const [x, y] = lmPx(lm, idx, W, H);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
}

type MakeupStyle =
  | 'classic-lip' | 'glam' | 'blush' | 'smokey'
  | 'liner' | 'nude' | 'ombre-lip' | 'contour';

export function renderMakeup(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  W: number,
  H: number,
  itemId: string,
  cfg: OverlayConfig
): void {
  ctx.save();
  ctx.globalAlpha = cfg.opacity;

  const style = itemId as MakeupStyle;

  switch (style) {
    case 'classic-lip':  drawClassicLip(ctx, landmarks, W, H, cfg);  break;
    case 'glam':         drawGlam(ctx, landmarks, W, H, cfg);         break;
    case 'blush':        drawBlush(ctx, landmarks, W, H, cfg);        break;
    case 'smokey':       drawSmokey(ctx, landmarks, W, H, cfg);       break;
    case 'liner':        drawLiner(ctx, landmarks, W, H, cfg);        break;
    case 'nude':         drawNude(ctx, landmarks, W, H, cfg);         break;
    case 'ombre-lip':    drawOmbreLip(ctx, landmarks, W, H, cfg);     break;
    case 'contour':      drawContour(ctx, landmarks, W, H, cfg);      break;
    default:             drawClassicLip(ctx, landmarks, W, H, cfg);
  }

  ctx.restore();
}

function drawClassicLip(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  ctx.filter = `blur(${cfg.intensity * 3}px)`;
  ctx.fillStyle = cfg.color;
  pathFromIndices(ctx, lm, LM.LIP_OUTER, W, H);
  ctx.fill();
  ctx.filter = 'none';
}

function drawGlam(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  // Bold lip
  ctx.filter = `blur(${cfg.intensity * 2}px)`;
  ctx.fillStyle = cfg.color;
  pathFromIndices(ctx, lm, LM.LIP_OUTER, W, H);
  ctx.fill();

  // Eye shadow
  ctx.filter = `blur(${cfg.intensity * 6}px)`;
  ctx.fillStyle = cfg.color + '88';
  pathFromIndices(ctx, lm, LM.LEFT_EYE, W, H);
  ctx.fill();
  pathFromIndices(ctx, lm, LM.RIGHT_EYE, W, H);
  ctx.fill();

  // Brow
  ctx.filter = `blur(${cfg.intensity * 3}px)`;
  ctx.fillStyle = cfg.color + 'aa';
  pathFromIndices(ctx, lm, LM.LEFT_BROW, W, H);
  ctx.fill();
  pathFromIndices(ctx, lm, LM.RIGHT_BROW, W, H);
  ctx.fill();

  ctx.filter = 'none';
}

function drawBlush(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  ctx.filter = `blur(${cfg.intensity * 14}px)`;
  ctx.fillStyle = cfg.color + '70';
  pathFromIndices(ctx, lm, LM.LEFT_CHEEK, W, H);
  ctx.fill();
  pathFromIndices(ctx, lm, LM.RIGHT_CHEEK, W, H);
  ctx.fill();
  ctx.filter = 'none';
}

function drawSmokey(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  // Dark heavy eye shadow — extend beyond eye
  ctx.filter = `blur(${cfg.intensity * 9}px)`;
  ctx.fillStyle = cfg.color + 'cc';
  pathFromIndices(ctx, lm, LM.LEFT_EYE, W, H);
  ctx.fill();
  pathFromIndices(ctx, lm, LM.RIGHT_EYE, W, H);
  ctx.fill();

  // Brow fill
  ctx.filter = `blur(${cfg.intensity * 4}px)`;
  ctx.fillStyle = cfg.color + 'aa';
  pathFromIndices(ctx, lm, LM.LEFT_BROW, W, H);
  ctx.fill();
  pathFromIndices(ctx, lm, LM.RIGHT_BROW, W, H);
  ctx.fill();

  // Subtle lip
  ctx.filter = `blur(${cfg.intensity * 2}px)`;
  ctx.fillStyle = cfg.color + '66';
  pathFromIndices(ctx, lm, LM.LIP_OUTER, W, H);
  ctx.fill();

  ctx.filter = 'none';
}

function drawLiner(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  const thickness = cfg.intensity * 4 + 1;
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth   = thickness;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.filter      = `blur(0.6px)`;

  // Left eye liner
  const leftEye = LM.LEFT_EYE.map(i => lmPx(lm, i, W, H));
  ctx.beginPath();
  leftEye.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.stroke();

  // Right eye liner
  const rightEye = LM.RIGHT_EYE.map(i => lmPx(lm, i, W, H));
  ctx.beginPath();
  rightEye.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.stroke();

  // Wing flicks
  const [lx0, ly0] = leftEye[leftEye.length - 1];
  ctx.beginPath();
  ctx.moveTo(lx0, ly0);
  ctx.lineTo(lx0 - thickness * 5, ly0 - thickness * 6);
  ctx.stroke();

  const [rx0, ry0] = rightEye[0];
  ctx.beginPath();
  ctx.moveTo(rx0, ry0);
  ctx.lineTo(rx0 + thickness * 5, ry0 - thickness * 6);
  ctx.stroke();

  ctx.filter = 'none';
}

function drawNude(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  ctx.filter = `blur(${cfg.intensity * 2.5}px)`;
  ctx.fillStyle = cfg.color + 'a0';
  pathFromIndices(ctx, lm, LM.LIP_OUTER, W, H);
  ctx.fill();
  ctx.filter = 'none';
}

function drawOmbreLip(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  const lipPts = LM.LIP_OUTER.map(i => lmPx(lm, i, W, H));
  const xs = lipPts.map(p => p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const grad = ctx.createLinearGradient(minX, 0, maxX, 0);
  grad.addColorStop(0, cfg.color);
  grad.addColorStop(0.5, cfg.color + 'cc');
  grad.addColorStop(1, '#ff6b6b');

  ctx.filter = `blur(${cfg.intensity * 2.5}px)`;
  ctx.fillStyle = grad;
  pathFromIndices(ctx, lm, LM.LIP_OUTER, W, H);
  ctx.fill();
  ctx.filter = 'none';
}

function drawContour(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  W: number, H: number,
  cfg: OverlayConfig
) {
  ctx.filter = `blur(${cfg.intensity * 12}px)`;

  // Left jaw shadow
  ctx.fillStyle = cfg.color + '60';
  pathFromIndices(ctx, lm, LM.FACE_LEFT, W, H);
  ctx.fill();

  // Right jaw shadow
  pathFromIndices(ctx, lm, LM.FACE_RIGHT, W, H);
  ctx.fill();

  // Under-cheek shadows
  ctx.fillStyle = cfg.color + '50';
  pathFromIndices(ctx, lm, LM.LEFT_CHEEK, W, H);
  ctx.fill();
  pathFromIndices(ctx, lm, LM.RIGHT_CHEEK, W, H);
  ctx.fill();

  // Forehead highlight strip
  const [nx, ny] = lmPx(lm, LM.NOSE_TIP, W, H);
  const [tx, ty] = lmPx(lm, LM.FACE_TOP, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse((nx + tx) / 2, (ny + ty) / 2, Math.abs(tx - nx) * 0.15 + 20, Math.abs(ny - ty) * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.filter = 'none';
}
