import type { Landmark, OverlayConfig } from '../types';

const LM = {
  L_EYE_OUT:  33,   // outer left eye corner
  L_EYE_IN:   133,  // inner left eye corner
  R_EYE_OUT:  362,  // outer right eye corner (mirrored)
  R_EYE_IN:   263,  // inner right eye corner
  NOSE_BRIDGE: 168,
  L_EAR:      234,
  R_EAR:      454,
  CHIN:       152,
  FOREHEAD:   10,
};

interface EyeGeo {
  lx: number; ly: number;
  rx: number; ry: number;
  midX: number; midY: number;
  /** Span calibrated to face width — not just IPD */
  span: number;
  angle: number;
}

function getEyeGeo(lm: Landmark[], W: number, H: number, cfg: OverlayConfig): EyeGeo | null {
  const lo = lm[LM.L_EYE_OUT];  const li = lm[LM.L_EYE_IN];
  const ro = lm[LM.R_EYE_OUT];  const ri = lm[LM.R_EYE_IN];
  const le = lm[LM.L_EAR];      const re = lm[LM.R_EAR];
  if (!lo || !li || !ro || !ri) return null;

  const lx = ((lo.x + li.x) / 2) * W;
  const ly = ((lo.y + li.y) / 2) * H + cfg.offsetY;
  const rx = ((ro.x + ri.x) / 2) * W;
  const ry = ((ro.y + ri.y) / 2) * H + cfg.offsetY;
  const ipd = Math.hypot(rx - lx, ry - ly);

  // Use face width (ear-to-ear) when available for calibrated scale
  // Glasses frame width ≈ 92-95% of face width
  let span: number;
  if (le && re) {
    const faceW = Math.hypot((re.x - le.x) * W, (re.y - le.y) * H);
    // Blend IPD-based and face-width-based estimates
    span = (ipd * 1.28 * 0.35 + faceW * 0.93 * 0.65) * cfg.scale;
  } else {
    span = ipd * 1.38 * cfg.scale;
  }

  return {
    lx, ly, rx, ry,
    midX: (lx + rx) / 2,
    midY: (ly + ry) / 2,
    span,
    angle: Math.atan2(ry - ly, rx - lx),
  };
}

type GlassesStyle = 'wayfarer' | 'round' | 'cateye' | 'aviator' | 'square' | 'sporty';

export function renderGlasses(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  W: number, H: number,
  itemId: string,
  cfg: OverlayConfig
): void {
  const geo = getEyeGeo(landmarks, W, H, cfg);
  if (!geo) return;

  const { midX, midY, span, angle } = geo;

  ctx.save();
  ctx.globalAlpha = cfg.opacity;
  ctx.translate(midX, midY);
  ctx.rotate(angle);

  const style = itemId as GlassesStyle;
  switch (style) {
    case 'wayfarer': drawWayfarer(ctx, span, cfg.color); break;
    case 'round':    drawRound(ctx, span, cfg.color);    break;
    case 'cateye':   drawCateye(ctx, span, cfg.color);   break;
    case 'aviator':  drawAviator(ctx, span, cfg.color);  break;
    case 'square':   drawSquare(ctx, span, cfg.color);   break;
    case 'sporty':   drawSporty(ctx, span, cfg.color);   break;
    default:         drawWayfarer(ctx, span, cfg.color);
  }

  ctx.restore();
}

// ─── Frame styles ────────────────────────────────────────────────────────────

function drawWayfarer(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const lw = span * 0.42;
  const lh = span * 0.30;
  const lx = -span * 0.265;
  const rx =  span * 0.265;
  const fw = span * 0.044;

  ctx.strokeStyle = color;  ctx.lineWidth = fw;
  ctx.fillStyle   = color + '28';
  ctx.lineCap = 'round';    ctx.lineJoin = 'round';

  ctx.beginPath(); ctx.roundRect(lx - lw/2, -lh/2, lw, lh, span*0.04); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(rx - lw/2, -lh/2, lw, lh, span*0.04); ctx.fill(); ctx.stroke();

  ctx.beginPath(); ctx.moveTo(lx + lw/2, 0); ctx.lineTo(rx - lw/2, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - lw/2, -lh*0.1); ctx.lineTo(lx - lw/2 - span*0.2, -lh*0.28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + lw/2, -lh*0.1); ctx.lineTo(rx + lw/2 + span*0.2, -lh*0.28); ctx.stroke();
}

function drawRound(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const r  = span * 0.21;
  const lx = -span * 0.27;
  const rx =  span * 0.27;
  const fw = span * 0.037;

  ctx.strokeStyle = color; ctx.lineWidth = fw; ctx.fillStyle = color + '28';

  ctx.beginPath(); ctx.arc(lx, 0, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(rx, 0, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lx + r, -r*0.3);
  ctx.quadraticCurveTo((lx+rx)/2, -r*0.6, rx - r, -r*0.3);
  ctx.stroke();

  ctx.beginPath(); ctx.moveTo(lx - r, 0); ctx.lineTo(lx - r - span*0.2, -r*0.32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + r, 0); ctx.lineTo(rx + r + span*0.2, -r*0.32); ctx.stroke();
}

function drawCateye(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const lx = -span * 0.265;
  const rx =  span * 0.265;
  const w  = span * 0.265;
  const h  = span * 0.20;
  const fw = span * 0.040;

  ctx.strokeStyle = color; ctx.lineWidth = fw; ctx.fillStyle = color + '28'; ctx.lineCap = 'round';

  function catLens(cx: number, flip: number) {
    ctx.beginPath();
    ctx.moveTo(cx - w, h*0.25);
    ctx.bezierCurveTo(cx - w*0.9, -h, cx + w*0.5, -h*1.2, cx + w*flip, -h*0.8);
    ctx.bezierCurveTo(cx + w*0.9*flip, -h*0.4, cx + w*0.6*flip, h*0.5, cx - w*0.1, h*0.4);
    ctx.quadraticCurveTo(cx - w*0.5, h*0.5, cx - w, h*0.25);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  catLens(lx, 1); catLens(rx, -1);

  ctx.beginPath(); ctx.moveTo(lx + w*0.8, 0); ctx.lineTo(rx - w*0.8, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - w, h*0.1); ctx.lineTo(lx - w - span*0.18, -h*0.28); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + w, -h*0.8); ctx.lineTo(rx + w + span*0.18, -h*0.48); ctx.stroke();
}

function drawAviator(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const lx = -span * 0.27;
  const rx =  span * 0.27;
  const rw = span * 0.215;
  const rh = span * 0.255;
  const fw = span * 0.031;

  ctx.strokeStyle = color; ctx.lineWidth = fw; ctx.fillStyle = color + '22';

  ctx.beginPath(); ctx.ellipse(lx, rh*0.1, rw, rh, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(rx, rh*0.1, rw, rh, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lx - rw*0.3, -rh*0.82);
  ctx.quadraticCurveTo((lx+rx)/2, -rh*1.02, rx + rw*0.3, -rh*0.82);
  ctx.stroke();

  ctx.beginPath(); ctx.moveTo(lx + rw, -rh*0.08); ctx.quadraticCurveTo((lx+rx)/2, rh*0.18, rx - rw, -rh*0.08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - rw*0.3, -rh*0.82); ctx.lineTo(lx - rw*0.3 - span*0.2, -rh*0.96); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + rw*0.3, -rh*0.82); ctx.lineTo(rx + rw*0.3 + span*0.2, -rh*0.96); ctx.stroke();
}

function drawSquare(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const s  = span * 0.235;
  const lx = -span * 0.268;
  const rx =  span * 0.268;
  const fw = span * 0.042;

  ctx.strokeStyle = color; ctx.lineWidth = fw; ctx.fillStyle = color + '28'; ctx.lineCap = 'square';

  ctx.beginPath(); ctx.rect(lx - s/2, -s/2, s, s); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(rx - s/2, -s/2, s, s); ctx.fill(); ctx.stroke();

  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(lx + s/2, 0); ctx.lineTo(rx - s/2, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx - s/2, -s*0.1); ctx.lineTo(lx - s/2 - span*0.2, -s*0.32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rx + s/2, -s*0.1); ctx.lineTo(rx + s/2 + span*0.2, -s*0.32); ctx.stroke();
}

function drawSporty(ctx: CanvasRenderingContext2D, span: number, color: string) {
  const fw = span * 0.048;
  ctx.strokeStyle = color; ctx.lineWidth = fw; ctx.fillStyle = color + '38';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-span*0.48, -span*0.06);
  ctx.bezierCurveTo(-span*0.33, -span*0.23, -span*0.1, -span*0.23, 0, -span*0.17);
  ctx.bezierCurveTo( span*0.1,  -span*0.23,  span*0.33, -span*0.23, span*0.48, -span*0.06);
  ctx.bezierCurveTo( span*0.40,  span*0.13,  span*0.12,  span*0.15, 0,          span*0.11);
  ctx.bezierCurveTo(-span*0.12,  span*0.15, -span*0.40,  span*0.13, -span*0.48, -span*0.06);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, -span*0.05, span*0.04, span*0.07, 0, 0, Math.PI*2); ctx.fill();
}
