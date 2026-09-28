import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dreamsacademy.pt',
  // Endereços sem barra final (/tecnicadecabelos), como no Vercel com cleanUrls.
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto', format: 'file' },
});
