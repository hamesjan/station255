// The catalog that powers the homepage arcade grid.
// Add a tool here + create src/routes/<slug>/+page.svelte and it shows up.

export type Tool = {
  slug: string;
  name: string;
  tagline: string;
  /** Emoji/icon shown on the cabinet card. */
  icon: string;
  /** false = card shows a "soon" badge and is not linked. */
  live: boolean;
};

export const tools: Tool[] = [
  {
    slug: 'palette-extractor',
    name: 'Palette Extractor',
    tagline: 'Pull the dominant colors out of any image.',
    icon: '🎨',
    live: true
  },
  {
    slug: 'demake',
    name: 'Demake',
    tagline: 'Pixelize a photo into NES / Game Boy / PICO-8 vibes.',
    icon: '👾',
    live: true
  },
  {
    slug: 'crt',
    name: 'CRT-ify',
    tagline: 'Scanlines, bloom & phosphor glow for any screenshot.',
    icon: '📺',
    live: true
  },
  {
    slug: 'pixel-text',
    name: 'Pixel Text',
    tagline: 'Turn words into arcade-font PNG logos & banners.',
    icon: '🅰️',
    live: false
  }
];
