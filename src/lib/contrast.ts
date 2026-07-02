// WCAG 2.1 relative luminance + contrast ratio — gamma-corrected, not to be
// confused with $lib/palette.ts's `luminance()` (a different, non-WCAG formula
// used there for picking a readable label color, not for accessibility checks).

export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const h = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0-1. https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1-21. https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export function passAA(ratio: number, large: boolean): boolean {
  return ratio >= (large ? 3 : 4.5);
}

export function passAAA(ratio: number, large: boolean): boolean {
  return ratio >= (large ? 4.5 : 7);
}
