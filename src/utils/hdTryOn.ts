/**
 * hdTryOn — photorealistic clothing generation via CatVTON.
 *
 * Primary model: CatVTON (zhengchong/CatVTON on HF Spaces)
 *   - Accepts person image + garment flat-lay + mask
 *   - Returns photorealistic try-on image
 *   - Free via the HF Spaces Gradio API (rate-limited without token)
 *
 * Set VITE_HF_TOKEN in .env for higher rate limits.
 * Set VITE_CATVTON_SPACE to override the HF Space slug (default: zhengchong/CatVTON).
 */

import { Client } from '@gradio/client';
import type { PoseLandmark } from '../types/pose';
import { POSE_LM } from '../types/pose';
import { CLOTHING_SVG } from './AssetGenerator';

const SPACE_SLUG = import.meta.env.VITE_CATVTON_SPACE ?? 'zhengchong/CatVTON';
const HF_TOKEN   = import.meta.env.VITE_HF_TOKEN ?? undefined;

export interface TryOnParams {
  videoEl:        HTMLVideoElement;
  canvasEl:       HTMLCanvasElement;
  itemId:         string;
  color:          string;
  poseLandmarks:  PoseLandmark[] | null;
}

export interface TryOnResult {
  dataUrl: string;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateHDTryOn(p: TryOnParams): Promise<TryOnResult> {
  const personBlob  = await capturePersonFrame(p.videoEl, p.canvasEl);
  const garmentBlob = await renderGarmentFlat(p.itemId, p.color);
  // Mask generated for future use when CatVTON Space accepts it
  generateTorsoMask(p.poseLandmarks, p.canvasEl.width, p.canvasEl.height);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = await Client.connect(SPACE_SLUG, HF_TOKEN ? { hf_token: HF_TOKEN } as any : {});

  // CatVTON's submit function expects: person_image, cloth_image, cloth_type, num_inference_steps, guidance_scale, seed
  // The exact parameter list matches the Space's Gradio interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await client.predict('/submit_tryon', {
    person_image:        personBlob,
    cloth_image:         garmentBlob,
    cloth_type:          'upper',
    num_inference_steps: 50,
    guidance_scale:      2.5,
    seed:                42,
    show_type:           'result only',
  });

  // Gradio returns the image as a { url, ... } object or a Blob
  const raw = result?.data?.[0];
  if (!raw) throw new Error('CatVTON returned no output image.');

  const dataUrl = await resolveToDataUrl(raw);
  return { dataUrl };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Capture current video frame (mirrored to match canvas overlay) as a JPEG Blob. */
async function capturePersonFrame(
  video: HTMLVideoElement,
  overlay: HTMLCanvasElement,
): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width  = overlay.width;
  c.height = overlay.height;
  const ctx = c.getContext('2d')!;
  // Mirror horizontally — same transform as the live camera-video element
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -c.width, 0, c.width, c.height);
  ctx.restore();
  return canvasToBlob(c, 'image/jpeg', 0.90);
}

/** Render the selected garment SVG centered on a white 768×1024 canvas. */
async function renderGarmentFlat(itemId: string, color: string): Promise<Blob> {
  const svgFn = CLOTHING_SVG[itemId];
  if (!svgFn) throw new Error(`No SVG found for item "${itemId}"`);

  const W = 768; const H = 1024;
  const c   = document.createElement('canvas');
  c.width   = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // White background (standard for garment product images)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Load SVG as image and draw centered with padding
  const img = await svgToImage(svgFn(color));
  const pad = 60;
  ctx.drawImage(img, pad, pad, W - pad * 2, H - pad * 2);

  return canvasToBlob(c, 'image/png');
}

/** Generate a torso mask canvas: white over the clothing region, black elsewhere. */
function generateTorsoMask(
  pose: PoseLandmark[] | null,
  W: number,
  H: number,
): Blob {
  const c   = document.createElement('canvas');
  c.width   = W; c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  if (pose) {
    const ls = pose[POSE_LM.LEFT_SHOULDER];
    const rs = pose[POSE_LM.RIGHT_SHOULDER];
    const lh = pose[POSE_LM.LEFT_HIP];
    const rh = pose[POSE_LM.RIGHT_HIP];

    if (ls && rs && lh && rh) {
      const pad = 0.06; // add 6% of image width as padding around torso
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo((ls.x - pad) * W, (ls.y - pad * 0.5) * H);
      ctx.lineTo((rs.x + pad) * W, (rs.y - pad * 0.5) * H);
      ctx.lineTo((rh.x + pad) * W, (rh.y + pad) * H);
      ctx.lineTo((lh.x - pad) * W, (lh.y + pad) * H);
      ctx.closePath();
      ctx.fill();
    } else {
      // Fallback: mask the centre-torso region heuristically
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(W * 0.2, H * 0.25, W * 0.6, H * 0.55);
    }
  } else {
    // No pose — mask a generous centre strip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(W * 0.18, H * 0.22, W * 0.64, H * 0.60);
  }

  // Feather the mask edges for seamless blending
  featherMask(ctx, W, H, 24);

  // Synchronous canvas → Blob via toDataURL (avoids async for masks)
  const dataUrl = c.toDataURL('image/png');
  return dataURLtoBlob(dataUrl);
}

/** Soften mask edges by blurring a copy and compositing back. */
function featherMask(ctx: CanvasRenderingContext2D, W: number, H: number, radius: number) {
  const tmp   = document.createElement('canvas');
  tmp.width   = W; tmp.height = H;
  const tctx  = tmp.getContext('2d')!;
  tctx.filter = `blur(${radius}px)`;
  tctx.drawImage(ctx.canvas, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(tmp, 0, 0);
}

// ─── Small utilities ──────────────────────────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('canvas.toBlob failed')),
      type,
      quality,
    );
  });
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime          = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary        = atob(b64);
  const bytes         = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function svgToImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
  });
}

/** Normalise whatever Gradio returns (Blob, { url }, string) into a data URL. */
async function resolveToDataUrl(raw: unknown): Promise<string> {
  if (raw instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader  = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(raw);
    });
  }
  if (typeof raw === 'string') return raw;
  // Gradio often returns { url: 'https://...' } for hosted Spaces
  if (typeof raw === 'object' && raw !== null && 'url' in raw) {
    const resp = await fetch((raw as { url: string }).url);
    const blob = await resp.blob();
    return resolveToDataUrl(blob);
  }
  throw new Error('Unrecognised Gradio output format.');
}
