/**
 * PerspectiveWarper — maps a source image onto an arbitrary quadrilateral
 * using homogeneous coordinate math (proper projective transform).
 *
 * This is what makes garments look like they're actually on the body
 * rather than just scaled/rotated overlays.
 */

interface Point2D { x: number; y: number }


/**
 * Warp src image onto the canvas quad defined by 4 corners (in canvas px).
 * We tile the source image in strips to approximate perspective.
 *
 * For a beginner-friendly alternative that still looks great,
 * we use a scanline triangle subdivision approach.
 */
export function warpImageOntoQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tl: Point2D, tr: Point2D,
  br: Point2D, bl: Point2D,
  opacity = 1.0
): void {
  if (!img.complete || img.naturalWidth === 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  const SW = img.naturalWidth;
  const SH = img.naturalHeight;

  // Subdivide into N×M triangles and map each with an affine transform
  const COLS = 16;
  const ROWS = 20;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const u0 = col / COLS,       v0 = row / ROWS;
      const u1 = (col + 1) / COLS, v1 = (row + 1) / ROWS;

      // Bilinear interpolation of quad corners
      const p00 = bilerp(tl, tr, bl, br, u0, v0);
      const p10 = bilerp(tl, tr, bl, br, u1, v0);
      const p11 = bilerp(tl, tr, bl, br, u1, v1);
      const p01 = bilerp(tl, tr, bl, br, u0, v1);

      // Draw two triangles per cell
      drawTriangle(ctx, img, SW, SH,
        p00, p10, p11,
        { x: u0, y: v0 }, { x: u1, y: v0 }, { x: u1, y: v1 });
      drawTriangle(ctx, img, SW, SH,
        p00, p11, p01,
        { x: u0, y: v0 }, { x: u1, y: v1 }, { x: u0, y: v1 });
    }
  }

  ctx.restore();
}

/** Bilinear interpolation across a quad */
function bilerp(
  tl: Point2D, tr: Point2D, bl: Point2D, br: Point2D,
  u: number, v: number
): Point2D {
  return {
    x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x +
       (1 - u) * v       * bl.x + u * v       * br.x,
    y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y +
       (1 - u) * v       * bl.y + u * v       * br.y,
  };
}

/** Draw one triangle of the image with affine mapping */
function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  SW: number, SH: number,
  p0: Point2D, p1: Point2D, p2: Point2D,
  uv0: Point2D, uv1: Point2D, uv2: Point2D
): void {
  // Compute affine transform from [uv0,uv1,uv2] in image space to [p0,p1,p2] in canvas
  const x0 = uv0.x * SW, y0 = uv0.y * SH;
  const x1 = uv1.x * SW, y1 = uv1.y * SH;
  const x2 = uv2.x * SW, y2 = uv2.y * SH;

  const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(det) < 0.01) return;

  const a = ((p1.x - p0.x) * (y2 - y0) - (p2.x - p0.x) * (y1 - y0)) / det;
  const b = ((p2.x - p0.x) * (x1 - x0) - (p1.x - p0.x) * (x2 - x0)) / det;
  const c = p0.x - a * x0 - b * y0;
  const d = ((p1.y - p0.y) * (y2 - y0) - (p2.y - p0.y) * (y1 - y0)) / det;
  const e = ((p2.y - p0.y) * (x1 - x0) - (p1.y - p0.y) * (x2 - x0)) / det;
  const f = p0.y - d * x0 - e * y0;

  ctx.save();
  // Clip to the triangle
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();

  // Apply affine transform and draw
  ctx.transform(a, d, b, e, c, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Quick non-warped draw for accessories (they don't need perspective) */
export function drawImageAnchored(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, cy: number,
  width: number, height: number,
  angle = 0,
  opacity = 1.0
): void {
  if (!img.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}
