import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Páginas que não devem ir para o Google.
const PRIVATE = ['/reuniao-agendada', '/404'];

export default defineConfig({
  site: 'https://www.empowermarketing.online',
  // Endereços sem barra final (/servicos), como no Vercel com cleanUrls.
  trailingSlash: 'never',
  // CSS dentro da página: o primeiro ecrã não espera por ficheiros de estilo.
  build: { inlineStylesheets: 'always', format: 'file' },
  integrations: [
    sitemap({
      filter: (page) => !PRIVATE.some((p) => new URL(page).pathname.replace(/\/$/, '') === p),
      changefreq: 'monthly',
      lastmod: new Date(),
    }),
  ],
});
