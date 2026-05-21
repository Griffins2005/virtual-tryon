import type { Landmark, OverlayConfig } from '../types';
import type { PoseLandmark, BodyGeometry } from '../types/pose';
import { extractBodyGeometry } from '../types/pose';

type ClothingStyle = 'tshirt' | 'hoodie' | 'jacket' | 'dress';

export function renderClothing(
  ctx: CanvasRenderingContext2D,
  faceLandmarks: Landmark[],
  W: number,
  H: number,
  itemId: string,
  cfg: OverlayConfig,
  poseLandmarks?: PoseLandmark[] | null
): void {
  ctx.save();
  ctx.globalAlpha = cfg.opacity;
  const style = itemId as ClothingStyle;
  if (poseLandmarks && poseLandmarks.length > 0) {
    const geo = extractBodyGeometry(poseLandmarks, W, H);
    if (geo) { drawFromPose(ctx, style, geo, cfg); ctx.restore(); return; }
  }
  drawFromFace(ctx, style, faceLandmarks, W, H, cfg);
  ctx.restore();
}

function drawFromPose(ctx: CanvasRenderingContext2D, style: ClothingStyle, geo: BodyGeometry, cfg: OverlayConfig) {
  const scale = cfg.scale;
  const dx = (geo.rShoulderX - geo.lShoulderX) * (scale - 1) / 2;
  const sw = Math.hypot((geo.rShoulderX + dx) - (geo.lShoulderX - dx), geo.rShoulderY - geo.lShoulderY);
  ctx.save();
  ctx.translate(geo.shoulderMidX, geo.shoulderMidY);
  ctx.rotate(geo.shoulderAngle);
  const half = sw / 2;
  const torso = geo.torsoHeight * scale;
  switch (style) {
    case 'tshirt': poseDrawTshirt(ctx, half, torso, cfg.color); break;
    case 'hoodie': poseDrawHoodie(ctx, half, torso, cfg.color); break;
    case 'jacket': poseDrawJacket(ctx, half, torso, cfg.color); break;
    case 'dress':  poseDrawDress(ctx, half, torso, cfg.color);  break;
  }
  ctx.restore();
}

function poseDrawTshirt(ctx: CanvasRenderingContext2D, half: number, torso: number, color: string) {
  const sr = half * 0.55; const hem = torso * 1.05;
  ctx.fillStyle = color; ctx.strokeStyle = darken(color, 0.12); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-half, 0); ctx.lineTo(-half - sr, -half * 0.32); ctx.lineTo(-half - sr * 0.1, half * 0.35);
  ctx.lineTo(-half * 0.92, hem); ctx.lineTo(half * 0.92, hem);
  ctx.lineTo(half + sr * 0.1, half * 0.35); ctx.lineTo(half + sr, -half * 0.32); ctx.lineTo(half, 0);
  ctx.quadraticCurveTo(half * 0.55, -half * 0.42, 0, -half * 0.45);
  ctx.quadraticCurveTo(-half * 0.55, -half * 0.42, -half, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, -half * 0.3, half * 0.18, half * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = hem * 0.3 + i * hem * 0.22;
    ctx.beginPath(); ctx.moveTo(-half * 0.4 + i * 10, y); ctx.quadraticCurveTo(0, y + 6, half * 0.4 - i * 10, y); ctx.stroke();
  }
}

function poseDrawHoodie(ctx: CanvasRenderingContext2D, half: number, torso: number, color: string) {
  poseDrawTshirt(ctx, half, torso, color);
  ctx.fillStyle = darken(color, 0.1);
  ctx.beginPath(); ctx.ellipse(0, -half * 0.34, half * 0.32, half * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, -half * 0.3, half * 0.19, half * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darken(color, 0.1); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-half * 0.38, torso * 0.42, half * 0.76, torso * 0.32, 8); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(0, -half * 0.15); ctx.lineTo(0, torso * 0.42); ctx.stroke(); ctx.setLineDash([]);
}

function poseDrawJacket(ctx: CanvasRenderingContext2D, half: number, torso: number, color: string) {
  const sr = half * 0.72; const hem = torso * 1.08;
  ctx.fillStyle = color; ctx.strokeStyle = darken(color, 0.15); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-half, 0); ctx.lineTo(-half - sr, half * 0.55); ctx.lineTo(-half - sr * 0.85, half * 0.7);
  ctx.lineTo(-half * 0.85, half * 0.38); ctx.lineTo(-half * 0.92, hem); ctx.lineTo(half * 0.92, hem);
  ctx.lineTo(half * 0.85, half * 0.38); ctx.lineTo(half + sr * 0.85, half * 0.7); ctx.lineTo(half + sr, half * 0.55);
  ctx.lineTo(half, 0); ctx.quadraticCurveTo(half * 0.55, -half * 0.42, 0, -half * 0.44);
  ctx.quadraticCurveTo(-half * 0.55, -half * 0.42, -half, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = darken(color, 0.08);
  ([-1, 1] as const).forEach(dir => {
    const lx = dir * half * 0.16;
    ctx.beginPath(); ctx.moveTo(lx, -half * 0.42); ctx.lineTo(lx + dir * half * 0.28, -half * 0.14);
    ctx.lineTo(lx + dir * half * 0.18, torso * 0.12); ctx.lineTo(lx, -half * 0.08); ctx.closePath(); ctx.fill();
  });
  const btnC = isLight(color) ? 'rgba(80,80,80,0.7)' : 'rgba(220,200,140,0.85)';
  [0.1, 0.3, 0.52].forEach(t => {
    ctx.fillStyle = btnC; ctx.beginPath(); ctx.arc(-half * 0.04, torso * t, half * 0.028, 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
  ctx.strokeRect(-half * 0.55, torso * 0.0, half * 0.27, torso * 0.18);
}

function poseDrawDress(ctx: CanvasRenderingContext2D, half: number, torso: number, color: string) {
  const flare = half * 1.35; const hem = torso * 1.75;
  ctx.fillStyle = color; ctx.strokeStyle = darken(color, 0.1); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-half * 0.55, 0); ctx.quadraticCurveTo(0, -half * 0.44, half * 0.55, 0);
  ctx.lineTo(half * 0.52, torso * 0.55); ctx.lineTo(-half * 0.52, torso * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-half * 0.52, torso * 0.55);
  ctx.bezierCurveTo(-half * 0.8, torso * 0.8, -flare, torso * 1.3, -flare * 1.05, hem);
  ctx.lineTo(flare * 1.05, hem);
  ctx.bezierCurveTo(flare, torso * 1.3, half * 0.8, torso * 0.8, half * 0.52, torso * 0.55);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = darken(color, 0.15); ctx.fillRect(-half * 0.52, torso * 0.5, half * 1.04, torso * 0.1);
  ctx.strokeStyle = darken(color, 0.1); ctx.lineWidth = half * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-half * 0.22, -half * 0.42); ctx.lineTo(-half * 0.46, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(half * 0.22, -half * 0.42); ctx.lineTo(half * 0.46, 0); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, -half * 0.28, half * 0.2, half * 0.08, 0, 0, Math.PI * 2); ctx.fill();
}

function drawFromFace(ctx: CanvasRenderingContext2D, style: ClothingStyle, lm: Landmark[], W: number, H: number, cfg: OverlayConfig) {
  const lt = lm[127] ?? { x: 0.25, y: 0.45 }; const rt = lm[356] ?? { x: 0.75, y: 0.45 };
  const chin = lm[152] ?? { x: 0.5, y: 0.70 }; const fore = lm[10] ?? { x: 0.5, y: 0.30 };
  const lsx = lt.x * W; const rsx = rt.x * W;
  const midX = (lsx + rsx) / 2;
  const faceH = Math.abs((chin.y - fore.y) * H);
  const midY = chin.y * H + faceH * 0.55 + cfg.offsetY;
  const half = Math.hypot(rsx - lsx, (rt.y - lt.y) * H) * cfg.scale * 0.92;
  const torso = faceH * cfg.scale * 2.0;
  const angle = Math.atan2((rt.y - lt.y) * H, rsx - lsx);
  ctx.save(); ctx.translate(midX, midY); ctx.rotate(angle);
  switch (style) {
    case 'tshirt': poseDrawTshirt(ctx, half, torso, cfg.color); break;
    case 'hoodie': poseDrawHoodie(ctx, half, torso, cfg.color); break;
    case 'jacket': poseDrawJacket(ctx, half, torso, cfg.color); break;
    case 'dress':  poseDrawDress(ctx, half, torso, cfg.color);  break;
  }
  ctx.restore();
}

function darken(hex: string, amount: number): string {
  let c = hex.replace('#','');
  if (c.length === 3) c = c.split('').map(x => x+x).join('');
  const r = Math.max(0, parseInt(c.slice(0,2),16) - Math.round(255*amount));
  const g = Math.max(0, parseInt(c.slice(2,4),16) - Math.round(255*amount));
  const b = Math.max(0, parseInt(c.slice(4,6),16) - Math.round(255*amount));
  return `rgb(${r},${g},${b})`;
}
function isLight(hex: string): boolean {
  const c = hex.replace('#','');
  return (parseInt(c.slice(0,2),16)*299 + parseInt(c.slice(2,4),16)*587 + parseInt(c.slice(4,6),16)*114)/1000 > 140;
}
