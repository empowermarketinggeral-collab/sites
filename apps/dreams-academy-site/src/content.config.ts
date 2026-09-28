import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const cta = z.object({ label: z.string(), href: z.string() });
const stat = z.object({ value: z.string(), label: z.string() });
const titled = z.object({ title: z.string(), text: z.string().optional(), label: z.string().optional(), items: z.array(z.string()).optional() });

// Páginas de venda de produto: um ficheiro .json por produto; o nome do ficheiro é o endereço.
// Todas as secções exceto hero, offer, guarantee e final são opcionais.
const produtos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/produtos' }),
  schema: z.object({
    meta: z.object({ title: z.string(), description: z.string() }),
    trainer: z.enum(['patricia', 'beatriz']),
    urgency: z.string().optional(),
    hero: z.object({
      eyebrow: z.string(),
      title: z.string(),
      accent: z.string().optional(),
      subtitle: z.string().optional(),
      text: z.string(),
      extra: z.string().optional(),
      cta: cta,
      note: z.string().optional(),
      highlights: z.array(z.string()).default([]),
    }),
    problem: z.object({
      eyebrow: z.string(),
      title: z.string(),
      accent: z.string().optional(),
      text: z.string().optional(),
      items: z.array(z.union([z.string(), titled])),
      question: z.string().optional(),
      stats: z.array(stat).default([]),
      closing: z.string().optional(),
    }).optional(),
    solution: z.object({
      eyebrow: z.string(),
      title: z.string(),
      text: z.string().optional(),
      points: z.array(z.string()).default([]),
      steps: z.array(titled).default([]),
      stats: z.array(stat).default([]),
    }).optional(),
    modules: z.object({ eyebrow: z.string(), title: z.string(), items: z.array(titled) }).optional(),
    bonuses: z.object({ eyebrow: z.string(), title: z.string().optional(), items: z.array(titled) }).optional(),
    testimonials: z.object({
      eyebrow: z.string(),
      title: z.string(),
      items: z.array(z.object({ quote: z.string(), name: z.string(), role: z.string(), result: z.string().optional() })),
    }).optional(),
    offer: z.object({
      eyebrow: z.string(),
      badge: z.string().optional(),
      title: z.string(),
      text: z.string().optional(),
      was: z.string(),
      price: z.string(),
      note: z.string(),
      includes: z.array(z.string()),
      cta: cta,
      secure: z.string().default('Pagamento 100% seguro • Acesso imediato'),
      tiers: z.array(z.object({ label: z.string(), price: z.string(), note: z.string(), active: z.boolean().default(false) })).default([]),
    }),
    guarantee: z.object({ title: z.string(), accent: z.string(), text: z.string().optional(), quote: z.string() }),
    faq: z.object({ eyebrow: z.string(), title: z.string(), items: z.array(z.object({ q: z.string(), a: z.string() })) }).optional(),
    final: z.object({
      eyebrow: z.string().default('Última chamada'),
      title: z.string(),
      text: z.string().optional(),
      cta: cta,
      badges: z.array(z.string()).default([]),
    }),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({ title: z.string(), updated: z.string() }),
});

export const collections = { produtos, legal };
