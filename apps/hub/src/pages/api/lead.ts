import type { APIRoute } from 'astro';
import { postToBigBoss, tokenEnvKey } from '../../lib/leads';
import { clientIp, originMatches, rateLimiter, siteFor } from '../../lib/sites';

// Recebe leads dos sites (ex.: quiz do Índice de Posição) e passa-os à função
// lead-intake do Big Boss. O token fica só aqui, em variáveis de ambiente:
//   BIGBOSS_LEAD_URL                 https://<projeto>.supabase.co/functions/v1/lead-intake
//   LEAD_TOKEN_<ID_DO_SITE>          ex.: LEAD_TOKEN_EMPOWER_MARKETING
// Só aceita pedidos vindos do domínio registado para o site no hub.

const MAX_BODY = 20_000;
const limited = rateLimiter(10); // leads por minuto por IP

function cors(origin: string): Record<string, string> {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

export const OPTIONS: APIRoute = async ({ request, url }) => {
  const origin = request.headers.get('origin');
  const site = await siteFor(url.searchParams.get('site') ?? '');
  if (!site || !originMatches(site, origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: cors(origin!) });
};

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const origin = request.headers.get('origin');
  const site = await siteFor(url.searchParams.get('site') ?? '');
  if (!site || !originMatches(site, origin)) {
    console.error('api/lead: pedido recusado', { site: url.searchParams.get('site'), origin, registered: site?.domain ?? 'site não existe no hub' });
    return json({ error: 'forbidden' }, 403);
  }
  const headers = cors(origin!);

  if (limited(clientIp(request.headers, clientAddress))) return json({ error: 'too_many' }, 429, headers);
  const body = await request.text();
  if (body.length > MAX_BODY) return json({ error: 'too_large' }, 413, headers);
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return json({ error: 'bad_request' }, 400, headers);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'bad_request' }, 400, headers);

  try {
    const r = await postToBigBoss(site.id, data);
    if (r.status === 0) {
      console.error(`api/lead: falta BIGBOSS_LEAD_URL ou ${tokenEnvKey(site.id)}`);
      return json({ error: 'not_configured' }, 503, headers);
    }
    const ok = r.status >= 200 && r.status < 300;
    if (!ok) console.error('api/lead: Big Boss respondeu', r.status, r.body);
    return json(ok ? { ok } : { error: `bigboss_${r.status}` }, ok ? 200 : 502, headers);
  } catch (err) {
    console.error('api/lead: falha ao contactar o Big Boss', err);
    return json({ error: 'upstream' }, 502, headers);
  }
};
