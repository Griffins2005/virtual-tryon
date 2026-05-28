import React, { useEffect, useRef } from 'react';
import type { TryOnItem } from '../types';
import { renderGlasses }  from '../renderers/glassesRenderer';
import { CLOTHING_SVG, ACCESSORY_SVG, getSVGImage } from '../utils/AssetGenerator';

const FAKE_FACE = (() => {
  const lm: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 500; i++) lm.push({ x: 0.5, y: 0.5, z: 0 });
  const cx = 0.5, cy = 0.44;
  lm[33]  = { x: cx - 0.13, y: cy - 0.02, z: 0 };
  lm[133] = { x: cx - 0.09, y: cy - 0.02, z: 0 };
  lm[362] = { x: cx + 0.09, y: cy - 0.02, z: 0 };
  lm[263] = { x: cx + 0.13, y: cy - 0.02, z: 0 };
  lm[159] = { x: cx - 0.11, y: cy - 0.04, z: 0 };
  lm[386] = { x: cx + 0.11, y: cy - 0.04, z: 0 };
  lm[168] = { x: cx,        y: cy,        z: 0 };
  lm[127] = { x: cx - 0.2,  y: cy - 0.02, z: 0 };
  lm[356] = { x: cx + 0.2,  y: cy - 0.02, z: 0 };
  lm[152] = { x: cx,        y: cy + 0.22, z: 0 };
  lm[10]  = { x: cx,        y: cy - 0.22, z: 0 };
  lm[234] = { x: cx - 0.22, y: cy,        z: 0 };
  lm[454] = { x: cx + 0.22, y: cy,        z: 0 };
  return lm;
})();

const DEFAULT_CFG = { scale: 0.95, offsetY: 0, opacity: 1, color: '', intensity: 0.6 };

/** Draw the item preview onto a canvas. SVG-based items load async and update the canvas when ready. */
function drawPreview(canvas: HTMLCanvasElement, item: TryOnItem): (() => void) | undefined {
  const W   = canvas.width;
  const H   = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const cfg = { ...DEFAULT_CFG, color: item.colors[0] ?? '#333' };

  // Glasses — synchronous canvas drawing
  if (item.category === 'glasses') {
    try { renderGlasses(ctx, FAKE_FACE, W, H, item.id, cfg); } catch { /* graceful */ }
    return;
  }

  // Clothing & accessories — use the same SVG images as the live renderer
  const svgRegistry: Record<string, ((c: string) => string) | undefined> = {
    ...CLOTHING_SVG,
    ...ACCESSORY_SVG,
  };
  const svgFn = svgRegistry[item.id];
  if (svgFn) {
    let cancelled = false;
    getSVGImage(svgFn, cfg.color)
      .then(img => {
        if (cancelled) return;
        ctx.clearRect(0, 0, W, H);
        // For clothing keep some vertical padding so the whole garment is visible
        const pad = item.category === 'clothing' ? Math.round(W * 0.04) : Math.round(W * 0.06);
        ctx.drawImage(img, pad, pad, W - pad * 2, H - pad * 2);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }

  // Makeup fallback — blurred lip swatch
  if (item.category === 'makeup') {
    ctx.save();
    ctx.fillStyle = cfg.color + 'cc';
    ctx.filter = 'blur(3px)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.62, W * 0.28, H * 0.09, 0, 0, Math.PI);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }
}

/* ── Full grid thumbnail (desktop sidebar) ───────────────────────────────── */
interface ThumbnailProps { item: TryOnItem; selected: boolean; onClick: () => void; }

export const ItemThumbnail: React.FC<ThumbnailProps> = ({ item, selected, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = drawPreview(canvas, item);
    return cleanup;
  }, [item]);

  return (
    <button
      onClick={onClick}
      style={{
        position:       'relative',
        borderRadius:   '10px',
        border:         selected ? '2px solid var(--accent, #c8ff00)' : '1.5px solid rgba(255,255,255,0.07)',
        background:     selected ? 'rgba(200,255,0,0.07)' : 'rgba(17,17,32,0.9)',
        cursor:         'pointer',
        padding:        '6px 4px 4px',
        transition:     'border-color 0.13s, background 0.13s, box-shadow 0.13s',
        boxShadow:      selected ? '0 0 16px rgba(200,255,0,0.18)' : 'none',
        aspectRatio:    '1',
        overflow:       'hidden',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '4px',
      }}
    >
      <canvas
        ref={canvasRef}
        width={80}
        height={60}
        style={{ width: '80%', height: 'auto', display: 'block' }}
      />
      <span style={{
        fontSize:    '10px',
        color:       selected ? 'var(--accent, #c8ff00)' : 'rgba(148,148,176,0.9)',
        fontWeight:  500,
        letterSpacing: '0.3px',
        maxWidth:    '90%',
        overflow:    'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:  'nowrap',
      }}>
        {item.name}
      </span>
    </button>
  );
};

/* ── Compact chip (mobile items strip) ───────────────────────────────────── */
export const ItemChip: React.FC<ThumbnailProps> = ({ item, selected, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cleanup = drawPreview(canvas, item);
    return cleanup;
  }, [item]);

  return (
    <button
      onClick={onClick}
      className={`item-chip ${selected ? 'active' : ''}`}
      title={item.name}
    >
      <canvas ref={canvasRef} width={40} height={32} />
      <span className="item-chip-label">{item.name}</span>
    </button>
  );
};
