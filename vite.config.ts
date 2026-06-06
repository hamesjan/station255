import { defineConfig } from 'vite';

// base: './' keeps asset paths relative so the built `dist/` can be dropped on
// any static host (itch.io, GitHub Pages, a plain folder) — platform agnostic.
export default defineConfig({
  base: './',
});
