import type { Landmark, OverlayConfig } from '../types';
import { darkenScale, screenScale } from '../utils/skinTone';

// Key landmark indices
const LM = {
  LIP_OUTER:  [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146],
  LIP_INNER:  [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95],
  LEFT_EYE:   [33,160,158,133,153,144],
  RIGHT_EYE:  [362,385,387,263,373,380],
  LEFT_BROW:  [70,63,105,66,107,55,65,52,53,46],
  RIGHT_BROW: [300,293,334,296,336,285,295,282,283,276],
  LEFT_CHEEK:  [50,101,118,117,111,36],
  RIGHT_CHEEK: [280,330,348,347,340,266],
  FACE_LEFT:   [234,93,132,58,172],
  FACE_RIGHT:  [454,323,361,288,397],
  NOSE_TIP:    1,
  L_EYE_CTR:   159,
  R_EYE_CTR:   386,
  FACE_TOP:    10,
  FACE_BOT:    152,
  L_EAR:       234,
  R_EAR:       454,
};

function lmPx(lm: Landmark[], idx: number, W: number, H: number): [number, number] {
  const p = lm[idx];
  return p ? [p.x * W, p.y * H] : [W/2, H/2];
}

function pathFrom(ctx: CanvasRenderingContext2D, lm: Landmark[], indices: number[], W: number, H: number) {
  ctx.beginPath();
  indices.forEach((idx, i) => {
    const [x, y] = lmPx(lm, idx, W, H);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
}

/** Estimate face size for blur/opacity scaling */
function faceScale(lm: Landmark[], W: number, H: number): number {
  const le = lm[LM.L_EAR]; const re = lm[LM.R_EAR];
  if (le && re) return Math.hypot((re.x - le.x) * W, (re.y - le.y) * H) / 280;
  return 1;
}

type MakeupStyle = 'classic-lip' | 'glam' | 'blush' | 'smokey' | 'liner' | 'nude' | 'ombre-lip' | 'contour';

export function renderMakeup(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  W: number, H: number,
  itemId: string,
  cfg: OverlayConfig
): void {
  ctx.save();
  ctx.globalAlpha = cfg.opacity;

  const style = itemId as MakeupStyle;
  switch (style) {
    case 'classic-lip': drawClassicLip(ctx, landmarks, W, H, cfg); break;
    case 'glam':        drawGlam(ctx, landmarks, W, H, cfg);        break;
    case 'blush':       drawBlush(ctx, landmarks, W, H, cfg);       break;
    case 'smokey':      drawSmokey(ctx, landmarks, W, H, cfg);      break;
    case 'liner':       drawLiner(ctx, landmarks, W, H, cfg);       break;
    case 'nude':        drawNude(ctx, landmarks, W, H, cfg);        break;
    case 'ombre-lip':   drawOmbreLip(ctx, landmarks, W, H, cfg);   break;
    case 'contour':     drawContour(ctx, landmarks, W, H, cfg);     break;
    default:            drawClassicLip(ctx, landmarks, W, H, cfg);
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────

function drawClassicLip(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  const blurPx = cfg.intensity * 2.5 * fs;
  // Boost lip visibility on dark skin (screen) vs light skin (source-over)
  const ss = screenScale();

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = cfg.opacity * Math.min(1.0, ss * 0.95);
  ctx.filter = `blur(${blurPx}px)`;
  ctx.fillStyle = cfg.color + 'dd';
  pathFrom(ctx, lm, LM.LIP_OUTER, W, H); ctx.fill();

  ctx.fillStyle = cfg.color + '55';
  pathFrom(ctx, lm, LM.LIP_INNER, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawGlam(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  const ss = screenScale();
  const ds = darkenScale();

  // Bold lip
  ctx.save();
  ctx.filter = `blur(${cfg.intensity * 2 * fs}px)`;
  ctx.fillStyle = cfg.color + 'ee';
  pathFrom(ctx, lm, LM.LIP_OUTER, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  // Eye shadow — screen lightens; adapt for skin tone
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = cfg.opacity * ss;
  ctx.filter = `blur(${cfg.intensity * 7 * fs}px)`;
  ctx.fillStyle = cfg.color + '66';
  pathFrom(ctx, lm, LM.LEFT_EYE,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.RIGHT_EYE, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  // Brows — darken; softer on dark skin
  ctx.save();
  ctx.globalAlpha = cfg.opacity * ds;
  ctx.filter = `blur(${cfg.intensity * 3 * fs}px)`;
  ctx.fillStyle = cfg.color + '99';
  pathFrom(ctx, lm, LM.LEFT_BROW,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.RIGHT_BROW, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawBlush(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  // Screen is subtle on dark skin — boost; reduce on very light skin
  const ss = screenScale();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = cfg.opacity * ss;
  ctx.filter = `blur(${cfg.intensity * 16 * fs}px)`;
  ctx.fillStyle = cfg.color + '60';
  pathFrom(ctx, lm, LM.LEFT_CHEEK,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.RIGHT_CHEEK, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawSmokey(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  // multiply on dark skin makes shadow disappear — reduce strength
  const ds = darkenScale();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = cfg.opacity * ds;
  ctx.filter = `blur(${cfg.intensity * 10 * fs}px)`;
  ctx.fillStyle = cfg.color + 'cc';
  pathFrom(ctx, lm, LM.LEFT_EYE,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.RIGHT_EYE, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = cfg.opacity * ds;
  ctx.filter = `blur(${cfg.intensity * 4 * fs}px)`;
  ctx.fillStyle = cfg.color + 'a0';
  pathFrom(ctx, lm, LM.LEFT_BROW,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.RIGHT_BROW, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  // Subtle lip — source-over, no adaptation needed
  ctx.save();
  ctx.filter = `blur(${cfg.intensity * 1.8 * fs}px)`;
  ctx.fillStyle = cfg.color + '55';
  pathFrom(ctx, lm, LM.LIP_OUTER, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawLiner(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  const thickness = (cfg.intensity * 3.5 + 1) * fs;

  ctx.save();
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth   = thickness;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.filter      = `blur(0.5px)`;

  const drawEyeLine = (indices: number[]) => {
    const pts = indices.map(i => lmPx(lm, i, W, H));
    ctx.beginPath();
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
    return pts;
  };

  const leftPts  = drawEyeLine(LM.LEFT_EYE);
  const rightPts = drawEyeLine(LM.RIGHT_EYE);

  // Wing flicks
  const [lx, ly] = leftPts[leftPts.length - 1];
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - thickness*4.5, ly - thickness*5.5); ctx.stroke();

  const [rx, ry] = rightPts[0];
  ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + thickness*4.5, ry - thickness*5.5); ctx.stroke();

  ctx.filter = 'none';
  ctx.restore();
}

function drawNude(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  // Slightly more visible on dark skin
  const ss = screenScale();
  ctx.save();
  ctx.globalAlpha = cfg.opacity * Math.min(1.0, ss * 0.92);
  ctx.filter = `blur(${cfg.intensity * 2 * fs}px)`;
  ctx.fillStyle = cfg.color + '99';
  pathFrom(ctx, lm, LM.LIP_OUTER, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawOmbreLip(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  const lipPts = LM.LIP_OUTER.map(i => lmPx(lm, i, W, H));
  const xs = lipPts.map(p => p[0]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);

  const grad = ctx.createLinearGradient(minX, 0, maxX, 0);
  grad.addColorStop(0,   cfg.color + 'cc');
  grad.addColorStop(0.5, cfg.color + 'ff');
  grad.addColorStop(1,   '#ff8888cc');

  ctx.save();
  ctx.filter = `blur(${cfg.intensity * 2 * fs}px)`;
  ctx.fillStyle = grad;
  pathFrom(ctx, lm, LM.LIP_OUTER, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
}

function drawContour(ctx: CanvasRenderingContext2D, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const fs = faceScale(lm, W, H);
  // Jaw contour — multiply is too harsh on dark skin
  const ds = darkenScale();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = cfg.opacity * ds;
  ctx.filter = `blur(${cfg.intensity * 14 * fs}px)`;
  ctx.fillStyle = cfg.color + '58';
  pathFrom(ctx, lm, LM.FACE_LEFT,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.FACE_RIGHT, W, H); ctx.fill();

  // Under-cheek
  ctx.fillStyle = cfg.color + '48';
  pathFrom(ctx, lm, LM.LEFT_CHEEK,  W, H); ctx.fill();
  pathFrom(ctx, lm, LM.RIGHT_CHEEK, W, H); ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  // Forehead highlight — screen for brightening; adapt for skin
  const [nx, ny] = lmPx(lm, LM.NOSE_TIP,  W, H);
  const [tx, ty] = lmPx(lm, LM.FACE_TOP,  W, H);
  const ss = screenScale();
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = cfg.opacity * Math.min(1.0, ss * 0.85);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(
    (nx + tx) / 2, (ny + ty) / 2,
    Math.abs(tx - nx) * 0.14 + 18 * fs,
    Math.abs(ny - ty) * 0.32,
    0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}
