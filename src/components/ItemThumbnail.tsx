import React, { useEffect, useRef } from 'react';
import type { TryOnItem } from '../types';
import { renderGlasses }  from '../renderers/glassesRenderer';
import { renderClothing } from '../renderers/clothingRenderer';

const FAKE_FACE_LANDMARKS = (() => {
  const lm: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 500; i++) lm.push({ x: 0.5, y: 0.5, z: 0 });

  const cx = 0.5, cy = 0.44;
  // Eye landmarks
  lm[33]  = { x: cx - 0.13, y: cy - 0.02, z: 0 };
  lm[133] = { x: cx - 0.09, y: cy - 0.02, z: 0 };
  lm[362] = { x: cx + 0.09, y: cy - 0.02, z: 0 };
  lm[263] = { x: cx + 0.13, y: cy - 0.02, z: 0 };
  lm[159] = { x: cx - 0.11, y: cy - 0.04, z: 0 };
  lm[386] = { x: cx + 0.11, y: cy - 0.04, z: 0 };
  lm[168] = { x: cx,        y: cy,        z: 0 };
  // Cheeks / temples
  lm[127] = { x: cx - 0.2,  y: cy - 0.02, z: 0 };
  lm[356] = { x: cx + 0.2,  y: cy - 0.02, z: 0 };
  lm[152] = { x: cx,        y: cy + 0.22, z: 0 };
  lm[10]  = { x: cx,        y: cy - 0.22, z: 0 };
  return lm;
})();

interface ThumbnailProps {
  item: TryOnItem;
  selected: boolean;
  onClick: () => void;
}

export const ItemThumbnail: React.FC<ThumbnailProps> = ({ item, selected, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cfg = {
      scale:   0.95,
      offsetY: 0,
      opacity: 1,
      color:   item.colors[0],
      intensity: 0.6,
    };

    try {
      if (item.category === 'glasses') {
        renderGlasses(ctx, FAKE_FACE_LANDMARKS, W, H, item.id, cfg);
      } else if (item.category === 'clothing') {
        renderClothing(ctx, FAKE_FACE_LANDMARKS, W, H, item.id, cfg);
      } else {
        // Makeup: draw a mouth/eye preview shape
        ctx.save();
        ctx.fillStyle = item.colors[0] + 'cc';
        ctx.filter = 'blur(3px)';
        ctx.beginPath();
        ctx.ellipse(W / 2, H * 0.6, W * 0.3, H * 0.1, 0, 0, Math.PI);
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
      }
    } catch {
      // Graceful fallback
    }
  }, [item]);

  return (
    <button
      onClick={onClick}
      style={{
        position:        'relative',
        borderRadius:    '10px',
        border:          selected ? '2px solid #c8ff00' : '1.5px solid #2a2a35',
        background:      selected ? '#1e261a' : '#13131a',
        cursor:          'pointer',
        padding:         '2px',
        transition:      'all 0.15s',
        boxShadow:       selected ? '0 0 14px rgba(200,255,0,0.2)' : 'none',
        aspectRatio:     '1',
        overflow:        'hidden',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '4px',
      }}
    >
      <canvas
        ref={canvasRef}
        width={80}
        height={60}
        style={{ width: '80%', height: 'auto' }}
      />
      <span style={{ fontSize: '10px', color: selected ? '#c8ff00' : '#888', fontWeight: 500, letterSpacing: '0.3px' }}>
        {item.name}
      </span>
    </button>
  );
};
