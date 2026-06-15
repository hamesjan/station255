import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Output a fully static site into dist/ so it drops straight onto the
    // existing Caddy file_server (see Caddyfile.site -> root .../dist).
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: undefined,
      precompress: false,
      strict: true
    })
  }
};

export default config;
