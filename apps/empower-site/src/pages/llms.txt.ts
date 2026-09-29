import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import site from '../data/site.json';
import home from '../data/home.json';
import mapa from '../data/mapa.json';
import servicos from '../data/servicos.json';
import faq from '../data/faq.json';

// llms.txt (https://llmstxt.org): resumo do negócio para assistentes de IA, gerado a partir dos dados do site.
export const GET: APIRoute = async () => {
  const url = (path: string) => new URL(path, site.meta.url).href;
  const posts = (await getCollection('insights')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const c = site.company;

  const lines = [
    `# ${c.name}`,
    '',
    `> ${site.seo.businessDescription}`,
    '',
    `Posicionamento: "${home.hero.struck} ${home.hero.title}" ${home.manifesto.text}`,
    '',
    `- Localização: ${site.seo.city}, Portugal (atende todo o país)`,
    `- Para quem: ${home.audience.yes.items.join('; ')}.`,
    `- Modelo: projetos de ${home.model.cards[0].title}, preço fechado. Ponto de partida: Mapa de Crescimento (${mapa.pricing.plans.map((p) => `${p.name} ${p.price}`).join(' · ')}).`,
    `- Contacto: ${c.email} · ${c.phone} · agendamento: ${site.links.booking}`,
    '',
    '## Páginas principais',
    '',
    `- [Início](${url('/')}): ${site.meta.description}`,
    `- [Mapa de Crescimento](${url('/mapadecrescimento')}): ${mapa.meta.description}`,
    `- [Soluções](${url('/servicos')}): ${servicos.meta.description}`,
    `- [Casos de Estudo](${url('/insights')}): resultados reais de clientes.`,
    '',
    '## Serviços',
    '',
    ...servicos.blocks.items.map((b) => `- ${b.title}: ${b.services.map((s) => s.name).join(', ')}.`),
    '',
    '## Casos de estudo',
    '',
    ...posts.map((p) => `- [${p.data.title}](${url(`/insights/${p.id}`)}): ${p.data.description}`),
    '',
    '## Perguntas frequentes',
    '',
    ...faq.items.map((i) => `- ${i.q} ${i.a}`),
    '',
    '## Optional',
    '',
    `- [Política de Privacidade](${url('/politica-de-privacidade')})`,
    `- [Termos e Condições](${url('/termos-e-condicoes')})`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
