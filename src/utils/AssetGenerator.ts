/**
 * AssetGenerator — creates high-quality SVG garment assets as data URLs.
 * These act as the "product images" that get perspective-warped onto the body.
 * In production you'd swap these with real product photos.
 */

export interface GarmentAsset {
  id: string;
  name: string;
  dataUrl: string;
  anchorTop: number;    // 0-1, where the shoulder line is in the image
  anchorBottom: number; // 0-1, where the hem is
  anchorLeft: number;   // 0-1, left shoulder x
  anchorRight: number;  // 0-1, right shoulder x
}

const W = 400;
const H = 500;

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function makeSVG(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${content}</svg>`;
}

// ─── T-Shirt ──────────────────────────────────────────────────────────────────
function tshirtSVG(color: string): string {
  const body = `
    <defs>
      <linearGradient id="shad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,0.18)"/>
        <stop offset="40%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
      </linearGradient>
      <linearGradient id="fold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.06)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.12)"/>
      </linearGradient>
    </defs>
    <!-- Main body -->
    <path d="M80,80 L20,140 L70,160 L70,440 L330,440 L330,160 L380,140 L320,80
             Q300,50 200,45 Q100,50 80,80 Z" fill="${color}"/>
    <!-- Sleeves -->
    <path d="M80,80 L20,140 L70,160 L100,100 Z" fill="${color}" opacity="0.95"/>
    <path d="M320,80 L380,140 L330,160 L300,100 Z" fill="${color}" opacity="0.95"/>
    <!-- Shade overlay -->
    <path d="M80,80 L20,140 L70,160 L70,440 L330,440 L330,160 L380,140 L320,80
             Q300,50 200,45 Q100,50 80,80 Z" fill="url(#shad)"/>
    <path d="M80,80 L20,140 L70,160 L70,440 L330,440 L330,160 L380,140 L320,80
             Q300,50 200,45 Q100,50 80,80 Z" fill="url(#fold)"/>
    <!-- Neckline -->
    <ellipse cx="200" cy="68" rx="55" ry="28" fill="rgba(0,0,0,0.25)"/>
    <!-- Seam lines -->
    <path d="M200,90 L200,440" stroke="rgba(0,0,0,0.07)" stroke-width="1.5" stroke-dasharray="4,6"/>
    <!-- Fabric wrinkles -->
    <path d="M120,200 Q140,210 130,230" stroke="rgba(0,0,0,0.06)" stroke-width="2" fill="none"/>
    <path d="M280,200 Q260,210 270,230" stroke="rgba(0,0,0,0.06)" stroke-width="2" fill="none"/>
    <path d="M155,320 Q200,335 245,320" stroke="rgba(0,0,0,0.05)" stroke-width="1.5" fill="none"/>
    <path d="M155,360 Q200,375 245,360" stroke="rgba(0,0,0,0.05)" stroke-width="1.5" fill="none"/>
  `;
  return makeSVG(body);
}

// ─── Hoodie ───────────────────────────────────────────────────────────────────
function hoodieSVG(color: string): string {
  const dark = shiftColor(color, -30);
  return makeSVG(`
    <defs>
      <linearGradient id="shad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,0.2)"/>
        <stop offset="45%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="55%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.2)"/>
      </linearGradient>
    </defs>
    <!-- Body -->
    <path d="M75,95 L15,155 L65,175 L65,445 L335,445 L335,175 L385,155 L325,95
             Q305,55 200,50 Q95,55 75,95 Z" fill="${color}"/>
    <!-- Hood -->
    <ellipse cx="200" cy="62" rx="75" ry="58" fill="${dark}"/>
    <ellipse cx="200" cy="68" rx="52" ry="42" fill="rgba(0,0,0,0.4)"/>
    <!-- Pocket -->
    <rect x="130" y="280" width="140" height="90" rx="10" fill="${dark}" opacity="0.85"/>
    <line x1="200" y1="280" x2="200" y2="370" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
    <!-- Zipper -->
    <line x1="200" y1="112" x2="200" y2="280" stroke="rgba(255,255,255,0.2)" stroke-width="2.5" stroke-dasharray="6,5"/>
    <!-- Shade -->
    <path d="M75,95 L15,155 L65,175 L65,445 L335,445 L335,175 L385,155 L325,95
             Q305,55 200,50 Q95,55 75,95 Z" fill="url(#shad)"/>
    <!-- Drawstrings -->
    <path d="M175,110 L160,160" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" fill="none"/>
    <path d="M225,110 L240,160" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" fill="none"/>
  `);
}

// ─── Jacket ───────────────────────────────────────────────────────────────────
function jacketSVG(color: string): string {
  const lapel = shiftColor(color, -20);
  const btn   = isLightColor(color) ? '#555' : '#d4af37';
  return makeSVG(`
    <defs>
      <linearGradient id="shad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,0.25)"/>
        <stop offset="40%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.25)"/>
      </linearGradient>
    </defs>
    <!-- Body -->
    <path d="M70,85 L10,165 L65,185 L65,445 L335,445 L335,185 L390,165 L330,85
             Q310,48 200,44 Q90,48 70,85 Z" fill="${color}"/>
    <!-- Long sleeves -->
    <path d="M70,85 L10,165 L60,185 L105,88 Z" fill="${color}"/>
    <path d="M330,85 L390,165 L340,185 L295,88 Z" fill="${color}"/>
    <!-- Lapels -->
    <path d="M185,60 L145,170 L185,260 L200,140 Z" fill="${lapel}"/>
    <path d="M215,60 L255,170 L215,260 L200,140 Z" fill="${lapel}"/>
    <!-- Collar -->
    <path d="M165,55 Q200,40 235,55 L225,90 Q200,80 175,90 Z" fill="${lapel}"/>
    <!-- Shade -->
    <path d="M70,85 L10,165 L65,185 L65,445 L335,445 L335,185 L390,165 L330,85
             Q310,48 200,44 Q90,48 70,85 Z" fill="url(#shad)"/>
    <!-- Buttons -->
    <circle cx="197" cy="220" r="9" fill="${btn}"/>
    <circle cx="197" cy="280" r="9" fill="${btn}"/>
    <circle cx="197" cy="340" r="9" fill="${btn}"/>
    <!-- Button holes -->
    <line x1="192" y1="220" x2="202" y2="220" stroke="rgba(0,0,0,0.4)" stroke-width="2"/>
    <line x1="192" y1="280" x2="202" y2="280" stroke="rgba(0,0,0,0.4)" stroke-width="2"/>
    <!-- Breast pocket -->
    <rect x="118" y="185" width="65" height="52" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
    <!-- Pocket square hint -->
    <path d="M130,186 L130,175 L155,175 L155,186" fill="rgba(255,255,255,0.15)"/>
  `);
}

// ─── Dress ────────────────────────────────────────────────────────────────────
function dressSVG(color: string): string {
  const waist = shiftColor(color, -25);
  return makeSVG(`
    <defs>
      <linearGradient id="skirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${shiftColor(color, -15)}"/>
      </linearGradient>
      <linearGradient id="shad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(0,0,0,0.2)"/>
        <stop offset="35%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="65%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.2)"/>
      </linearGradient>
    </defs>
    <!-- Bodice -->
    <path d="M130,65 Q200,40 270,65 L280,210 L120,210 Z" fill="${color}"/>
    <!-- Skirt -->
    <path d="M120,210 L280,210 L340,490 L60,490 Z" fill="url(#skirt)"/>
    <!-- Waist band -->
    <rect x="118" y="205" width="164" height="22" rx="4" fill="${waist}"/>
    <!-- Shade -->
    <path d="M130,65 Q200,40 270,65 L280,210 L120,210 Z" fill="url(#shad)"/>
    <path d="M120,210 L280,210 L340,490 L60,490 Z" fill="url(#shad)"/>
    <!-- Straps -->
    <path d="M165,65 L148,12" stroke="${color}" stroke-width="18" stroke-linecap="round"/>
    <path d="M235,65 L252,12" stroke="${color}" stroke-width="18" stroke-linecap="round"/>
    <!-- Neckline shadow -->
    <ellipse cx="200" cy="68" rx="48" ry="22" fill="rgba(0,0,0,0.22)"/>
    <!-- Skirt folds -->
    <path d="M160,230 Q155,330 145,430" stroke="rgba(0,0,0,0.06)" stroke-width="2" fill="none"/>
    <path d="M200,220 Q200,330 200,460" stroke="rgba(0,0,0,0.06)" stroke-width="2" fill="none"/>
    <path d="M240,230 Q245,330 255,430" stroke="rgba(0,0,0,0.06)" stroke-width="2" fill="none"/>
    <!-- Hem highlight -->
    <line x1="62" y1="488" x2="338" y2="488" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
  `);
}

// ─── Glasses SVGs ─────────────────────────────────────────────────────────────
function wayfarerSVG(color: string): string {
  return makeSVG(`
    <defs>
      <linearGradient id="lens" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(80,120,180,0.35)"/>
        <stop offset="100%" stop-color="rgba(40,60,120,0.55)"/>
      </linearGradient>
    </defs>
    <!-- Left lens -->
    <rect x="30" y="150" width="155" height="110" rx="12" fill="url(#lens)"/>
    <rect x="30" y="150" width="155" height="110" rx="12" fill="none" stroke="${color}" stroke-width="14"/>
    <!-- Right lens -->
    <rect x="215" y="150" width="155" height="110" rx="12" fill="url(#lens)"/>
    <rect x="215" y="150" width="155" height="110" rx="12" fill="none" stroke="${color}" stroke-width="14"/>
    <!-- Bridge -->
    <path d="M185,200 Q200,188 215,200" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
    <!-- Left arm -->
    <line x1="30" y1="175" x2="0" y2="150" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
    <!-- Right arm -->
    <line x1="370" y1="175" x2="400" y2="150" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
    <!-- Lens glare -->
    <path d="M50,165 L70,155 L80,175" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="3" stroke-linecap="round"/>
    <path d="M235,165 L255,155 L265,175" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="3" stroke-linecap="round"/>
  `);
}

// ─── Watch / Jewelry SVGs ─────────────────────────────────────────────────────
export function watchSVG(color: string): string {
  const face = isLightColor(color) ? '#f5f5f0' : '#1a1a2e';
  return makeSVG(`
    <defs>
      <radialGradient id="dial" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${shiftColor(face, 20)}"/>
        <stop offset="100%" stop-color="${face}"/>
      </radialGradient>
    </defs>
    <!-- Strap top -->
    <rect x="155" y="20" width="90" height="120" rx="12" fill="${color}"/>
    <!-- Case -->
    <rect x="100" y="130" width="200" height="240" rx="32" fill="${shiftColor(color, 15)}"/>
    <rect x="115" y="145" width="170" height="210" rx="26" fill="${shiftColor(color, 25)}"/>
    <!-- Dial -->
    <ellipse cx="200" cy="250" rx="75" ry="75" fill="url(#dial)"/>
    <!-- Hour markers -->
    ${[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
      const r = 0.88 * 75; const rad = (deg - 90) * Math.PI / 180;
      const x1 = 200 + Math.cos(rad) * r; const y1 = 250 + Math.sin(rad) * r;
      const len = i % 3 === 0 ? 10 : 6;
      const x2 = 200 + Math.cos(rad) * (r - len); const y2 = 250 + Math.sin(rad) * (r - len);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${isLightColor(face)?'#333':'#ccc'}" stroke-width="${i%3===0?2.5:1.5}"/>`;
    }).join('')}
    <!-- Hands -->
    <line x1="200" y1="250" x2="200" y2="195" stroke="${isLightColor(face)?'#222':'#eee'}" stroke-width="4" stroke-linecap="round"/>
    <line x1="200" y1="250" x2="238" y2="268" stroke="${isLightColor(face)?'#222':'#eee'}" stroke-width="3" stroke-linecap="round"/>
    <line x1="200" y1="250" x2="188" y2="302" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
    <!-- Center dot -->
    <circle cx="200" cy="250" r="6" fill="${isLightColor(face)?'#333':'#eee'}"/>
    <!-- Crown -->
    <rect x="370" y="230" width="28" height="40" rx="8" fill="${shiftColor(color, 20)}"/>
    <!-- Strap bottom -->
    <rect x="155" y="360" width="90" height="120" rx="12" fill="${color}"/>
    <!-- Buckle -->
    <rect x="172" y="438" width="56" height="24" rx="6" fill="${shiftColor(color, 25)}" stroke="${shiftColor(color,-10)}" stroke-width="2"/>
    <!-- Glass reflection -->
    <path d="M145,175 Q165,155 195,168" stroke="rgba(255,255,255,0.3)" stroke-width="4" fill="none" stroke-linecap="round"/>
  `);
}

export function ringsSVG(color: string): string {
  const metal = isLightColor(color) ? color : shiftColor(color, 30);
  return makeSVG(`
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shiftColor(metal, 40)}"/>
        <stop offset="40%" stop-color="${metal}"/>
        <stop offset="100%" stop-color="${shiftColor(metal, -20)}"/>
      </linearGradient>
    </defs>
    <!-- Ring band -->
    <ellipse cx="200" cy="250" rx="140" ry="55" fill="none" stroke="url(#metal)" stroke-width="32"/>
    <!-- Inner shadow -->
    <ellipse cx="200" cy="250" rx="140" ry="55" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="8"/>
    <!-- Gem setting -->
    <ellipse cx="200" cy="195" rx="38" ry="22" fill="${shiftColor(metal, 20)}"/>
    <!-- Gem -->
    <polygon points="200,172 228,195 200,215 172,195" fill="${color === '#d4af37' ? '#4fc3f7' : color}"/>
    <polygon points="200,172 228,195 200,185" fill="rgba(255,255,255,0.5)"/>
    <!-- Gem sparkles -->
    <path d="M200,165 L202,158 L204,165" fill="rgba(255,255,255,0.8)"/>
    <path d="M218,178 L225,176 L220,184" fill="rgba(255,255,255,0.6)"/>
  `);
}

export function necklaceSVG(color: string): string {
  const metal = shiftColor(color, 15);
  return makeSVG(`
    <defs>
      <radialGradient id="bead" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${shiftColor(metal, 50)}"/>
        <stop offset="100%" stop-color="${metal}"/>
      </radialGradient>
    </defs>
    <!-- Chain arc -->
    <path d="M40,80 Q200,380 360,80" fill="none" stroke="${metal}" stroke-width="5"/>
    <!-- Beads along chain -->
    ${Array.from({length: 18}, (_, i) => {
      const t = i / 17;
      const x = 40 + t * 320;
      const y = 80 + Math.sin(t * Math.PI) * 300;
      const r = i === 9 ? 18 : i % 3 === 0 ? 12 : 8;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#bead)"/>
              <circle cx="${(x-r*0.3).toFixed(1)}" cy="${(y-r*0.3).toFixed(1)}" r="${r*0.25}" fill="rgba(255,255,255,0.4)"/>`;
    }).join('')}
    <!-- Pendant -->
    <polygon points="200,330 222,380 200,368 178,380" fill="${metal}"/>
    <polygon points="200,330 222,380 200,355" fill="rgba(255,255,255,0.3)"/>
  `);
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function shiftColor(hex: string, amount: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, parseInt(c.slice(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(c.slice(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(c.slice(4, 6), 16) + amount));
  return `rgb(${r},${g},${b})`;
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  return (parseInt(c.slice(0, 2), 16) * 299 + parseInt(c.slice(2, 4), 16) * 587 + parseInt(c.slice(4, 6), 16) * 114) / 1000 > 140;
}

// ─── Public catalog ───────────────────────────────────────────────────────────
export const CLOTHING_SVG: Record<string, (color: string) => string> = {
  tshirt:  tshirtSVG,
  hoodie:  hoodieSVG,
  jacket:  jacketSVG,
  dress:   dressSVG,
};

export const GLASSES_SVG: Record<string, (color: string) => string> = {
  wayfarer: wayfarerSVG,
};

export const ACCESSORY_SVG: Record<string, (color: string) => string> = {
  watch:    watchSVG,
  rings:    ringsSVG,
  necklace: necklaceSVG,
};

/** Renders a garment SVG to an HTMLImageElement (async, cached) */
const _imgCache = new Map<string, HTMLImageElement>();

export async function getSVGImage(
  svgFn: (color: string) => string,
  color: string
): Promise<HTMLImageElement> {
  const key = svgFn.name + color;
  if (_imgCache.has(key)) return _imgCache.get(key)!;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => { _imgCache.set(key, img); resolve(img); };
    img.onerror = reject;
    img.src     = svgToDataUrl(svgFn(color));
  });
}
