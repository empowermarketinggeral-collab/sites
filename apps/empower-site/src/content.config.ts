import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    readingTime: z.number(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),
    highlight: z.string().optional(),
    highlightLabel: z.string().optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({ title: z.string(), updated: z.string() }),
});

export const collections = { insights, legal };
