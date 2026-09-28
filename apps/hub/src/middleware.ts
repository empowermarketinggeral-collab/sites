import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, isValidSession } from './lib/auth';

const PUBLIC_PATHS = new Set(['/login', '/api/collect', '/t.js', '/favicon.png']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (!PUBLIC_PATHS.has(pathname) && !isValidSession(context.cookies.get(SESSION_COOKIE)?.value)) {
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
