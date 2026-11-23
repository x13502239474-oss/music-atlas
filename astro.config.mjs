import { defineConfig } from 'astro/config';
import rehypeMusic from './src/lib/rehype-music.mjs';

export default defineConfig({
  site: 'https://x13502239474-oss.github.io',
  base: '/music-atlas/',
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: false },
    rehypePlugins: [rehypeMusic],
  },
  vite: {
    build: { cssMinify: true },
  },
});
