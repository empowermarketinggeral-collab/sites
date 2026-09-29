import type { APIRoute } from 'astro';
import { absolute, publicPages } from '../lib/pages';
import site from '../data/site.json';
import programa from '../data/programa.json';

// Resumo do site para assistentes de IA (ChatGPT, Claude, Perplexity…), no formato llms.txt.
// É gerado a partir dos mesmos ficheiros de conteúdo, por isso fica sempre atualizado.
export const GET: APIRoute = async () => {
  const { main, products, legal } = await publicPages();
  const line = (p: { path: string; title: string; description: string }) =>
    `- [${p.title.replace(/ [|·] Dreams.*$/, '')}](${absolute(p.path)})${p.description ? `: ${p.description}` : ''}`;
  const t = site.trainers;
  const text = `# Dreams Academy

> ${site.meta.description}

A Dreams Academy é uma academia portuguesa de formação para cabeleireiras e profissionais de beleza. Junta dois pilares: técnica profissional (diagnóstico capilar, corte, coloração, brushing) e marketing e negócio (posicionamento, redes sociais, funis de vendas). Os produtos digitais são vendidos e entregues pela Hotmart, com garantia de 15 dias. O Programa Dreams Academy (90 dias, com acompanhamento) tem entrada por candidatura.

## Formadoras

- ${t.patricia.name} — ${t.patricia.role}. ${t.patricia.facts.join('; ')}.
- ${t.beatriz.name} — ${t.beatriz.role}. ${t.beatriz.facts.join('; ')}.

## Páginas principais

${main.map(line).join('\n')}

## Programa Dreams Academy — o que inclui

${programa.includes.groups.map((g) => `- ${g.title}: ${g.items.join('; ')}`).join('\n')}

## Cursos e produtos

${products.map(line).join('\n')}

## Contacto

- E-mail: ${site.company.email}
- Instagram: ${site.links.instagram}

## Optional

${legal.map(line).join('\n')}
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
