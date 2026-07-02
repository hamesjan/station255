// Simple shelf/row bin packer — sort tallest-first, fill left-to-right per
// shelf, wrap to a new shelf once a row would exceed maxWidth. Not optimal,
// but fast, dependency-free, and good enough for a few dozen sprites.

export type PackInput = { name: string; w: number; h: number };
export type PackedRect = { name: string; x: number; y: number; w: number; h: number };
export type PackResult = { rects: PackedRect[]; width: number; height: number };

export function packShelves(items: PackInput[], maxWidth = 1024, padding = 2): PackResult {
  if (items.length === 0) return { rects: [], width: 0, height: 0 };

  const widest = Math.max(...items.map((i) => i.w));
  const effMaxWidth = Math.max(maxWidth, widest);

  const sorted = [...items].sort((a, b) => b.h - a.h);
  const rects: PackedRect[] = [];

  let shelfY = 0;
  let shelfH = 0;
  let cursorX = 0;
  let usedWidth = 0;

  for (const item of sorted) {
    const w = item.w + padding;
    const h = item.h + padding;
    if (cursorX + w > effMaxWidth && cursorX > 0) {
      shelfY += shelfH;
      cursorX = 0;
      shelfH = 0;
    }
    rects.push({ name: item.name, x: cursorX, y: shelfY, w: item.w, h: item.h });
    cursorX += w;
    shelfH = Math.max(shelfH, h);
    usedWidth = Math.max(usedWidth, cursorX);
  }

  const totalHeight = shelfY + shelfH;
  return {
    rects,
    width: Math.max(1, usedWidth - padding),
    height: Math.max(1, totalHeight - padding),
  };
}
