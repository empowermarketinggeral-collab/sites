import type { APIRoute } from 'astro';
import { absolute, publicPages } from '../lib/pages';

// Mapa do site para o Google e o Bing (referido no robots.txt).
export const GET: APIRoute = async () => {
  const { main, products, legal } = await publicPages();
  const today = new Date().toISOString().slice(0, 10);
  const urls = [...main, ...products, ...legal]
    .map((p) => `  <url><loc>${absolute(p.path)}</loc><lastmod>${today}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
