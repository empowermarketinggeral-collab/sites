import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// No Vercel usa o adaptador do Vercel; noutros sítios (local, Docker) corre como servidor Node.
export default defineConfig({
  output: 'server',
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
  security: { checkOrigin: true },
});
