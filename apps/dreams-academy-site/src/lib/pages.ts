import { getCollection } from 'astro:content';
import site from '../data/site.json';
import tecnica from '../data/tecnica.json';
import negocio from '../data/negocio.json';
import programa from '../data/programa.json';

// Lista das páginas públicas, usada no sitemap.xml e no llms.txt.
export interface PageInfo { path: string; title: string; description: string; priority: number; price?: string }

export async function publicPages(): Promise<{ main: PageInfo[]; products: PageInfo[]; legal: PageInfo[] }> {
  const main: PageInfo[] = [
    { path: '/', title: site.meta.title, description: site.meta.description, priority: 1 },
    { path: '/programa_dreams_academy', title: programa.meta.title, description: programa.meta.description, priority: 0.9 },
    { path: '/tecnicadecabelos', title: tecnica.meta.title, description: tecnica.meta.description, priority: 0.8 },
    { path: '/tmarketingenegocios', title: negocio.meta.title, description: negocio.meta.description, priority: 0.8 },
  ];
  const products = (await getCollection('produtos')).map((p) => ({
    path: `/${p.id}`, title: p.data.meta.title, description: p.data.meta.description, priority: 0.8, price: p.data.offer.price,
  }));
  const legalPaths: Record<string, string> = { 'termos-e-condicoes': '/termos_condicoes', 'politica-de-privacidade': '/politica_de_privacidade', 'politica-de-reembolso': '/politica_de_reembolso' };
  const legal = (await getCollection('legal')).map((l) => ({ path: legalPaths[l.id], title: l.data.title, description: '', priority: 0.2 }));
  return { main, products, legal };
}

// Igual ao endereço canónico de cada página (a página inicial termina em /).
export const absolute = (path: string) => new URL(path, site.meta.url).href;
