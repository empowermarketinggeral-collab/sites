import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://empowermarketing.online',
  // Endereços sem barra final (/servicos), como no Vercel com cleanUrls.
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto', format: 'file' },
});
