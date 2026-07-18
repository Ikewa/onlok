/**
 * badgeCardUtils.ts
 *
 * Utility functions for rendering and downloading the full
 * "Officially Verified Vendor" branded card (matching the design reference).
 *
 * All drawing is done on an offscreen HTML Canvas — no DOM capture needed.
 */

import type { BadgeTier } from '../components/OnlokBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BadgeCardOptions {
  /** e.g. "OL-NG-0065" */
  vendorId: string;
  /** e.g. "Zara's Snackistry" */
  businessName: string;
  /** gold | silver | bronze */
  tier: BadgeTier;
  /** Card width in px. Default: 1080 */
  width?: number;
  /** Card height in px. Default: 1350 */
  height?: number;
}

// Tier-specific badge image paths (resolved at runtime via the Vite base URL)
const BADGE_SRC: Record<BadgeTier, string> = {
  gold:   '/badges/badge-gold.png',
  silver: '/badges/badge-silver.png',
  bronze: '/badges/badge-bronze.png',
};

// Accent colours for the vendor-ID ribbon text per tier
const TIER_TEXT_COLOR: Record<BadgeTier, string> = {
  gold:   '#5C3D00',
  silver: '#2A2A2A',
  bronze: '#2D0A00',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Load an image from a URL and return an HTMLImageElement (CORS-safe for same-origin assets). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Wrap text onto multiple lines given a max pixel width.
 * Returns an array of line strings.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw a filled rounded rectangle. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * Draw text curved along a quadratic bezier path.
 * Mirrors the SVG <textPath> approach used in OnlokBadge.tsx.
 *
 * @param x0,y0  Start point of the quadratic bezier
 * @param cx,cy  Control point (pulls the curve up when cy < y0)
 * @param x1,y1  End point
 */
function drawTextAlongQuadraticCurve(
  ctx: CanvasRenderingContext2D,
  text: string,
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  color: string,
  fontSize: number,
  fontWeight = '900',
): void {
  // Parametric point on a quadratic bezier at t ∈ [0,1]
  const pt = (t: number) => ({
    x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1,
    y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1,
  });

  // Tangent angle at t
  const tangentAngle = (t: number): number => {
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    return Math.atan2(dy, dx);
  };

  // Approximate arc length by sampling
  const SAMPLES = 200;
  const cumLen: number[] = [0];
  for (let i = 1; i <= SAMPLES; i++) {
    const a = pt((i - 1) / SAMPLES);
    const b = pt(i / SAMPLES);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = cumLen[SAMPLES];

  // Binary-search for t that corresponds to a given arc length
  const tForLen = (len: number): number => {
    let lo = 0, hi = SAMPLES;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] < len) lo = mid + 1;
      else hi = mid;
    }
    if (lo === 0) return 0;
    const frac = (len - cumLen[lo - 1]) / (cumLen[lo] - cumLen[lo - 1] || 1);
    return ((lo - 1) + frac) / SAMPLES;
  };

  ctx.save();
  ctx.font         = `${fontWeight} ${fontSize}px "Inter", "Arial Black", sans-serif`;
  ctx.fillStyle    = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';

  // Measure each char so we can centre the full string on the curve
  const charWidths = text.split('').map(ch => ctx.measureText(ch).width);
  const totalTextW = charWidths.reduce((s, w) => s + w, 0);
  let curLen = (totalLen - totalTextW) / 2;

  for (let i = 0; i < text.length; i++) {
    const cw   = charWidths[i];
    const tMid = tForLen(curLen + cw / 2);
    const { x, y } = pt(tMid);
    const a = tangentAngle(tMid);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillText(text[i], -cw / 2, 0);
    ctx.restore();

    curLen += cw;
  }
  ctx.restore();
}

// ─── Core renderer ────────────────────────────────────────────────────────────

/**
 * Draws the full branded Officially Verified Vendor card onto an offscreen canvas
 * and returns it. The canvas is not attached to the DOM.
 */
export async function renderBadgeCardToCanvas(opts: BadgeCardOptions): Promise<HTMLCanvasElement> {
  const W = opts.width  ?? 1080;
  const H = opts.height ?? 1350;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── 1. Navy gradient background ──────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#0A1B6F');
  bg.addColorStop(0.5, '#071454');
  bg.addColorStop(1,   '#050E3C');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Subtle radial glow in the centre ──────────────────────────────────
  const glow = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.55);
  glow.addColorStop(0, 'rgba(30, 80, 200, 0.25)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── 3. Confetti decorations ───────────────────────────────────────────────
  drawConfetti(ctx, W, H);

  // ── 4. "OFFICIALLY VERIFIED VENDOR" heading ───────────────────────────────
  const headingY = H * 0.145;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#00D4FF';
  ctx.font = `900 ${W * 0.082}px "Inter", "Arial Black", sans-serif`;
  ctx.letterSpacing = `${W * 0.005}px`;
  ctx.fillText('OFFICIALLY', W / 2, headingY);
  ctx.fillText('VERIFIED VENDOR', W / 2, headingY + W * 0.095);
  ctx.letterSpacing = '0px';

  // ── 5. Load & draw badge sticker ─────────────────────────────────────────
  const badgeSize = W * 0.54;        // ~583 px @ 1080
  const badgeX    = (W - badgeSize) / 2;
  const badgeY    = H * 0.265;

  let badgeImg: HTMLImageElement | null = null;
  try {
    badgeImg = await loadImage(BADGE_SRC[opts.tier]);
  } catch {
    // Fall back to drawing a placeholder shield if image fails to load
  }

  if (badgeImg) {
    ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
  } else {
    // Fallback: simple gold circle
    ctx.beginPath();
    ctx.arc(W / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#C8960C';
    ctx.fill();
  }

  // ── 6. Vendor ID — curved along a quadratic bezier matching the SVG badge ribbon ──
  // Mirrors: M 18 62 Q 50 54 82 62  (100×100 viewBox in OnlokBadge.tsx)
  // Y ratios nudged up ~3 pts so the text sits perfectly in the ribbon groove.
  const textColor     = TIER_TEXT_COLOR[opts.tier];
  const vendorFontSz  = W * 0.036;

  drawTextAlongQuadraticCurve(
    ctx,
    opts.vendorId,
    badgeX + badgeSize * 0.18,  badgeY + badgeSize * 0.59,   // P0 (start)
    badgeX + badgeSize * 0.50,  badgeY + badgeSize * 0.51,   // control (apex)
    badgeX + badgeSize * 0.82,  badgeY + badgeSize * 0.59,   // P2 (end)
    textColor,
    vendorFontSz,
    '900',
  );

  // ── 7. Business name text (scroll ribbon below vendor ID) ─────────────────
  const scrollY = badgeY + badgeSize * 0.640;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = textColor;
  ctx.font         = `680 ${W * 0.028}px "Inter", Arial, sans-serif`;
  ctx.fillText(opts.businessName, W / 2, scrollY);

  // ── 8. Body paragraph ────────────────────────────────────────────────────
  const bodyTop      = badgeY + badgeSize + H * 0.04;
  const bodyFontSize = W * 0.034;
  const bodyMaxWidth = W * 0.74;

  ctx.fillStyle  = 'rgba(255,255,255,0.88)';
  ctx.font       = `400 ${bodyFontSize}px "Inter", Arial, sans-serif`;
  ctx.textAlign  = 'center';

  const bodyText  = `${opts.businessName} is verified and trusted for safer dealings online.`;
  const bodyLines = wrapText(ctx, bodyText, bodyMaxWidth);
  const lineH     = bodyFontSize * 1.55;

  bodyLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, bodyTop + i * lineH);
  });

  // ── 9. Footer ─────────────────────────────────────────────────────────────
  const footerY = H - H * 0.055;
  const padX    = W * 0.068;
  const logoH   = W * 0.50;    // height of the logo image in the footer

  // Left: real Onlok logo image
  try {
    const logoImg = await loadImage('/logo.png');
    const logoW   = logoImg.naturalWidth / logoImg.naturalHeight * logoH;
    // Vertically centre the logo around the same midpoint as the right-side text
    ctx.drawImage(logoImg, padX, footerY - logoH * 0.5, logoW, logoH);
  } catch {
    // Fallback: plain text if image fails to load
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font      = `700 ${W * 0.038}px "Inter", Arial, sans-serif`;
    ctx.fillText('Onlok', padX, footerY);
  }

  // Right: @onlokofficial
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = 'rgba(255,255,255,0.75)';
  ctx.font         = `600 ${W * 0.034}px "Inter", Arial, sans-serif`;
  ctx.fillText('@onlokofficial', W - padX, footerY);

  return canvas;
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

/** Draw scattered confetti shapes in the two top corners. */
function drawConfetti(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  // Confetti pieces: [x%, y%, rotation°, colour, shape]
  const pieces: Array<{ x: number; y: number; rot: number; color: string; rect?: boolean }> = [
    // Top-left cluster
    { x: 0.045, y: 0.032, rot: 35,  color: '#FFD700' },
    { x: 0.085, y: 0.018, rot: -20, color: '#FF6B6B', rect: true },
    { x: 0.115, y: 0.055, rot: 60,  color: '#4ECDC4' },
    { x: 0.065, y: 0.075, rot: 15,  color: '#FFD700', rect: true },
    { x: 0.025, y: 0.065, rot: -45, color: '#C8960C' },
    { x: 0.14,  y: 0.035, rot: 80,  color: '#FF6B6B' },
    { x: 0.10,  y: 0.085, rot: -10, color: '#FFD700', rect: true },
    // Top-right cluster (mirrored)
    { x: 0.875, y: 0.022, rot: -35, color: '#FF6B6B' },
    { x: 0.915, y: 0.048, rot: 25,  color: '#FFD700', rect: true },
    { x: 0.945, y: 0.025, rot: -60, color: '#4ECDC4' },
    { x: 0.87,  y: 0.07,  rot: 10,  color: '#FFD700' },
    { x: 0.96,  y: 0.065, rot: 45,  color: '#C8960C', rect: true },
    { x: 0.85,  y: 0.042, rot: -15, color: '#FF6B6B' },
    { x: 0.93,  y: 0.085, rot: 70,  color: '#FFD700', rect: true },
  ];

  for (const p of pieces) {
    const px = p.x * W;
    const py = p.y * H;
    const sz = W * 0.018;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.fillStyle = p.color;

    if (p.rect) {
      ctx.fillRect(-sz * 0.35, -sz * 0.7, sz * 0.7, sz * 1.4);
    } else {
      // Diamond / rotated square
      ctx.beginPath();
      ctx.moveTo(0, -sz * 0.7);
      ctx.lineTo(sz * 0.5, 0);
      ctx.lineTo(0, sz * 0.7);
      ctx.lineTo(-sz * 0.5, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Party popper emoji top-right (drawn as text)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `${W * 0.075}px Arial`;
  ctx.fillText('🎉', W * 0.92, H * 0.115);
  ctx.restore();
}

// ─── Public download functions ────────────────────────────────────────────────

/**
 * Renders the branded card and downloads it as a PNG file.
 */
export async function downloadBadgeAsPNG(opts: BadgeCardOptions): Promise<void> {
  const canvas = await renderBadgeCardToCanvas(opts);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `onlok-verified-${opts.vendorId}.png`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Renders the branded card and downloads it as an SVG file.
 * Since the card is complex (uses canvas + raster images), we embed
 * the canvas bitmap inside an SVG <image> element at the full resolution.
 */
export async function downloadBadgeAsSVG(opts: BadgeCardOptions): Promise<void> {
  const W = opts.width  ?? 1080;
  const H = opts.height ?? 1350;

  const canvas  = await renderBadgeCardToCanvas(opts);
  const dataUrl = canvas.toDataURL('image/png');

  // Wrap the raster rendering in an SVG envelope so it opens as .svg
  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `     width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `  <image href="${dataUrl}" x="0" y="0" width="${W}" height="${H}" />`,
    `</svg>`,
  ].join('\n');

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `onlok-verified-${opts.vendorId}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders the branded card and downloads it as a PDF file.
 * The card is placed on a single custom-sized page that matches the card aspect ratio.
 */
export async function downloadBadgeAsPDF(opts: BadgeCardOptions): Promise<void> {
  const W = opts.width  ?? 1080;
  const H = opts.height ?? 1350;

  const canvas  = await renderBadgeCardToCanvas(opts);
  const dataUrl = canvas.toDataURL('image/png');

  const { jsPDF } = await import('jspdf');

  // Use px units with the card's native dimensions so the image fills the page
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [W, H],
    hotfixes: ['px_scaling'],
  });

  doc.addImage(dataUrl, 'PNG', 0, 0, W, H);
  doc.save(`onlok-verified-${opts.vendorId}.pdf`);
}
