import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, isValidSession } from './lib/auth';

const PUBLIC_PATHS = new Set([
  '/login', '/api/collect', '/api/lead', '/t.js',
  // ícones e manifesto (o browser pede-os também no ecrã de entrada)
  '/favicon.png', '/favicon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/manifest.webmanifest',
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  // Sem OAuth: os clientes MCP procuram estes endereços; um 404 diz-lhes que a chave vai no endereço.
  if (pathname.startsWith('/.well-known/')) return new Response(null, { status: 404 });
  // O conector dos agentes (/mcp) tem a sua própria chave (HUB_AGENT_TOKEN).
  const isAgent = pathname === '/mcp' || pathname.startsWith('/mcp/');
  if (!isAgent && !PUBLIC_PATHS.has(pathname) && !isValidSession(context.cookies.get(SESSION_COOKIE)?.value)) {
    return context.redirect('/login');
  }

  const response = await next();
  const h = response.headers;
  h.set('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  h.set('X-Frame-Options', 'DENY');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'same-origin');
  h.set('Cache-Control', 'no-store');
  h.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});
