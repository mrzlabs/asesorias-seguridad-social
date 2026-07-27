import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://asesoriasas.com',
  output: 'static',
  build: { format: 'directory' },
  compressHTML: true,
});
