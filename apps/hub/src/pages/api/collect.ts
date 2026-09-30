import type { APIRoute } from 'astro';
import { clientIp, hostMatches, originMatches, rateLimiter, siteFor } from '../../lib/sites';
import { record } from '../../lib/tracking';

const EVENT_NAME = /^[a-z0-9_]{1,40}$/;
const limited = rateLimiter(60); // eventos por minuto por IP

function cors(origin: string | null): Record<string, string> {
  return origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : {};
}

export const OPTIONS: APIRoute = ({ request }) => new Response(null, { status: 204, headers: cors(request.headers.get('origin')) });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const origin = request.headers.get('origin');
  const headers = cors(origin);
  const body = await request.text();
  if (body.length > 2000) return new Response(null, { status: 413, headers });

  let data: { s?: string; n?: string; u?: string; r?: string };
  let url: URL;
  try {
    data = JSON.parse(body);
    url = new URL(String(data.u));
  } catch {
    return new Response(null, { status: 400, headers });
  }

  const site = await siteFor(String(data.s ?? ''));
  const name = String(data.n ?? 'pageview');
  // Só aceitamos eventos vindos do domínio registado para o site.
  if (!site || !hostMatches(site, url.hostname) || (origin && !originMatches(site, origin)) || !EVENT_NAME.test(name)) {
    return new Response(null, { status: 403, headers });
  }

  const h = request.headers;
  const ip = clientIp(h, clientAddress);
  if (limited(ip)) return new Response(null, { status: 429, headers });
  await record({
    siteId: site.id,
    name,
    url,
    referrer: String(data.r ?? ''),
    ip,
    ua: h.get('user-agent') ?? '',
    country: h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country') ?? h.get('x-country') ?? '',
    city: decodeURIComponent(h.get('cf-ipcity') ?? h.get('x-vercel-ip-city') ?? h.get('x-city') ?? ''),
  });
  return new Response(null, { status: 202, headers });
};
