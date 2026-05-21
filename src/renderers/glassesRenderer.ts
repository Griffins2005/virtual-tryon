import type { Landmark, OverlayConfig } from '../types';

// MediaPipe Face Mesh key indices
const LM = {
  LEFT_EYE_OUTER:  33,
  LEFT_EYE_INNER:  133,
  RIGHT_EYE_OUTER: 362,
  RIGHT_EYE_INNER: 263,
  NOSE_BRIDGE:     168,
  LEFT_EAR:        234,
  RIGHT_EAR:       454,
};

interface EyeGeometry {
  lx: number; ly: number;   // left eye center
  rx: number; ry: number;   // right eye center
  eyeSpan: number;           // pixel distance between eye centers
  angle: number;             // tilt angle
  bridgeX: number;
  bridgeY: number;
}

function getEyeGeometry(
  lm: Landmark[],
  W: number,
  H: number,
  offsetY: number
): EyeGeometry | null {
  const lo = lm[LM.LEFT_EYE_OUTER];
  const li = lm[LM.LEFT_EYE_INNER];
  const ro = lm[LM.RIGHT_EYE_OUTER];
  const ri = lm[LM.RIGHT_EYE_INNER];
  const nb = lm[LM.NOSE_BRIDGE];
  if (!lo || !li || !ro || !ri || !nb) return null;

  const lx = ((lo.x + li.x) / 2) * W;
  const ly = ((lo.y + li.y) / 2) * H + offsetY;
  const rx = ((ro.x + ri.x) / 2) * W;
  const ry = ((ro.y + ri.y) / 2) * H + offsetY;

  return {
    lx, ly, rx, ry,
    eyeSpan: Math.hypot(rx - lx, ry - ly),
    angle: Math.atan2(ry - ly, rx - lx),
    bridgeX: nb.x * W,
    bridgeY: nb.y * H + offsetY,
  };
}

type GlassesStyle = 'wayfarer' | 'round' | 'cateye' | 'aviator' | 'square' | 'sporty';

export function renderGlasses(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  W: number,
  H: number,
  itemId: string,
  cfg: OverlayConfig
): void {
  const geo = getEyeGeometry(landmarks, W, H, cfg.offsetY);
  if (!geo) return;

  const { lx, ly, rx, ry, eyeSpan, angle } = geo;
  const midX = (lx + rx) / 2;
  const midY = (ly + ry) / 2;
  const span = eyeSpan * cfg.scale * 1.35;

  ctx.save();
  ctx.globalAlpha = cfg.opacity;
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const style = itemId as GlassesStyle;

  switch (style) {
    case 'wayfarer':  drawWayfarer(ctx, span, cfg.color);   break;
    case 'round':     drawRound(ctx, span, cfg.color);      break;
    case 'cateye':    drawCateye(ctx, span, cfg.color);     break;
    case 'aviator':   drawAviator(ctx, span, cfg.color);    break;
    case 'square':    drawSquare(ctx, span, cfg.color);     break;
    case 'sporty':    drawSporty(ctx, span, cfg.color);     break;
    default:          drawWayfarer(ctx, span, cfg.color);
  }

  ctx.restore();
}

// ─── Individual frame styles ────────────────────────────────────────────────

function drawWayfarer(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const lw = span * 0.44;
  const lh = span * 0.33;
  const lx = -span * 0.27;
  const rx =  span * 0.27;
  const frameW = span * 0.046;

  ctx.strokeStyle = color;
  ctx.lineWidth   = frameW;
  ctx.fillStyle   = color + '28';
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // Left lens
  ctx.beginPath();
  ctx.roundRect(lx - lw / 2, -lh / 2, lw, lh, span * 0.04);
  ctx.fill();
  ctx.stroke();

  // Right lens
  ctx.beginPath();
  ctx.roundRect(rx - lw / 2, -lh / 2, lw, lh, span * 0.04);
  ctx.fill();
  ctx.stroke();

  // Bridge
  ctx.beginPath();
  ctx.moveTo(lx + lw / 2, 0);
  ctx.lineTo(rx - lw / 2, 0);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(lx - lw / 2, -lh * 0.1);
  ctx.lineTo(lx - lw / 2 - span * 0.22, -lh * 0.3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rx + lw / 2, -lh * 0.1);
  ctx.lineTo(rx + lw / 2 + span * 0.22, -lh * 0.3);
  ctx.stroke();
}

function drawRound(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const r  = span * 0.22;
  const lx = -span * 0.28;
  const rx =  span * 0.28;
  const fw = span * 0.038;

  ctx.strokeStyle = color;
  ctx.lineWidth   = fw;
  ctx.fillStyle   = color + '28';

  ctx.beginPath(); ctx.arc(lx, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(rx, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Bridge
  ctx.beginPath();
  ctx.moveTo(lx + r, -r * 0.3);
  ctx.quadraticCurveTo((lx + rx) / 2, -r * 0.6, rx - r, -r * 0.3);
  ctx.stroke();

  // Arms
  ctx.beginPath(); ctx.moveTo(lx - r, 0); ctx.lineTo(lx - r - span * 0.22, -r * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + r, 0); ctx.lineTo(rx + r + span * 0.22, -r * 0.35); ctx.stroke();
}

function drawCateye(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const lx = -span * 0.27;
  const rx =  span * 0.27;
  const w  = span * 0.27;
  const h  = span * 0.21;
  const fw = span * 0.042;

  ctx.strokeStyle = color;
  ctx.lineWidth   = fw;
  ctx.fillStyle   = color + '28';
  ctx.lineCap     = 'round';

  function catLens(cx: number, flip: number) {
    ctx.beginPath();
    ctx.moveTo(cx - w, h * 0.25);
    ctx.bezierCurveTo(cx - w * 0.9, -h, cx + w * 0.5, -h * 1.2, cx + w * flip, -h * 0.8);
    ctx.bezierCurveTo(cx + w * 0.9 * flip, -h * 0.4, cx + w * 0.6 * flip, h * 0.5, cx - w * 0.1, h * 0.4);
    ctx.quadraticCurveTo(cx - w * 0.5, h * 0.5, cx - w, h * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  catLens(lx, 1);
  catLens(rx, -1);

  // Bridge
  ctx.beginPath();
  ctx.moveTo(lx + w * 0.8, 0);
  ctx.lineTo(rx - w * 0.8, 0);
  ctx.stroke();

  // Arms
  ctx.beginPath(); ctx.moveTo(lx - w, h * 0.1); ctx.lineTo(lx - w - span * 0.2, -h * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + w, -h * 0.8); ctx.lineTo(rx + w + span * 0.2, -h * 0.5); ctx.stroke();
}

function drawAviator(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const lx = -span * 0.275;
  const rx =  span * 0.275;
  const rw = span * 0.225;
  const rh = span * 0.265;
  const fw = span * 0.032;

  ctx.strokeStyle = color;
  ctx.lineWidth   = fw;
  ctx.fillStyle   = color + '22';

  ctx.beginPath(); ctx.ellipse(lx, rh * 0.12, rw, rh, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(rx, rh * 0.12, rw, rh, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Top bar connecting lenses
  ctx.beginPath();
  ctx.moveTo(lx - rw * 0.3, -rh * 0.85);
  ctx.quadraticCurveTo((lx + rx) / 2, -rh * 1.05, rx + rw * 0.3, -rh * 0.85);
  ctx.stroke();

  // Nose bridge
  ctx.beginPath();
  ctx.moveTo(lx + rw, -rh * 0.1);
  ctx.quadraticCurveTo((lx + rx) / 2, rh * 0.2, rx - rw, -rh * 0.1);
  ctx.stroke();

  // Arms
  ctx.beginPath(); ctx.moveTo(lx - rw * 0.3, -rh * 0.85); ctx.lineTo(lx - rw * 0.3 - span * 0.22, -rh * 1.0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + rw * 0.3, -rh * 0.85); ctx.lineTo(rx + rw * 0.3 + span * 0.22, -rh * 1.0); ctx.stroke();
}

function drawSquare(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const s  = span * 0.245;
  const lx = -span * 0.275;
  const rx =  span * 0.275;
  const fw = span * 0.044;

  ctx.strokeStyle = color;
  ctx.lineWidth   = fw;
  ctx.fillStyle   = color + '28';
  ctx.lineCap     = 'square';

  ctx.beginPath(); ctx.rect(lx - s / 2, -s / 2, s, s); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(rx - s / 2, -s / 2, s, s); ctx.fill(); ctx.stroke();

  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(lx + s / 2, 0); ctx.lineTo(rx - s / 2, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - s / 2, -s * 0.1); ctx.lineTo(lx - s / 2 - span * 0.22, -s * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + s / 2, -s * 0.1); ctx.lineTo(rx + s / 2 + span * 0.22, -s * 0.35); ctx.stroke();
}

function drawSporty(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const fw = span * 0.05;
  ctx.strokeStyle = color;
  ctx.lineWidth   = fw;
  ctx.fillStyle   = color + '38';
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  ctx.beginPath();
  ctx.moveTo(-span * 0.5, -span * 0.07);
  ctx.bezierCurveTo(-span * 0.35, -span * 0.24, -span * 0.1, -span * 0.24, 0, -span * 0.18);
  ctx.bezierCurveTo( span * 0.1,  -span * 0.24,  span * 0.35, -span * 0.24, span * 0.5, -span * 0.07);
  ctx.bezierCurveTo( span * 0.42,  span * 0.14,  span * 0.12,  span * 0.16, 0,           span * 0.12);
  ctx.bezierCurveTo(-span * 0.12,  span * 0.16, -span * 0.42,  span * 0.14, -span * 0.5, -span * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Nose notch
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -span * 0.06, span * 0.04, span * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}
