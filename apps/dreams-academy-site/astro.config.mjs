import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dreamsacademy.pt',
  // Endereços sem barra final (/tecnicadecabelos), como no Vercel com cleanUrls.
  trailingSlash: 'never',
  // CSS embutido na página: evita um pedido que bloqueia a primeira pintura.
  build: { inlineStylesheets: 'always', format: 'file' },
});
