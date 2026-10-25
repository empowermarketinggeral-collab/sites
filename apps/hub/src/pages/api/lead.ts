import type { APIRoute } from 'astro';
import { saveLead, setBigBossResult } from '../../lib/backoffice';
import { postToBigBoss, tokenEnvKey } from '../../lib/leads';
import { clientIp, originMatches, rateLimiter, siteFor } from '../../lib/sites';

// Recebe leads dos sites (ex.: quiz do Índice de Posição) e passa-os à função
// lead-intake do Big Boss. O token fica só aqui, em variáveis de ambiente:
//   BIGBOSS_LEAD_URL                 https://<projeto>.supabase.co/functions/v1/lead-intake
//   LEAD_TOKEN_<ID_DO_SITE>          ex.: LEAD_TOKEN_EMPOWER_MARKETING
// Só aceita pedidos vindos do domínio registado para o site no hub.
// Cada lead fica guardado no back-office do hub (página Leads) antes de seguir
// para o Big Boss; sem token configurado fica só no hub e o site recebe "ok".

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

  const fields = data as Record<string, unknown>;
  // Campo-armadilha preenchido = robô: responde ok sem guardar nem reencaminhar.
  if (String(fields._honeypot ?? '').trim()) return json({ ok: true }, 200, headers);

  const h = request.headers;
  let leadId: string | null = null;
  try {
    leadId = await saveLead({
      siteId: site.id,
      data: fields,
      ip: clientIp(h, clientAddress),
      ua: h.get('user-agent') ?? '',
      country: h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country') ?? h.get('x-country') ?? '',
      city: decodeURIComponent(h.get('cf-ipcity') ?? h.get('x-vercel-ip-city') ?? h.get('x-city') ?? ''),
    });
  } catch (err) {
    console.error('api/lead: não foi possível guardar o lead no hub', err);
  }
  const remember = (status: number, error = '') => (leadId ? setBigBossResult(leadId, status, error).catch(() => {}) : undefined);

  try {
    const r = await postToBigBoss(site.id, fields);
    if (r.status === 0) {
      if (leadId) return json({ ok: true, stored: true }, 200, headers);
      console.error(`api/lead: falta BIGBOSS_LEAD_URL ou ${tokenEnvKey(site.id)}`);
      return json({ error: 'not_configured' }, 503, headers);
    }
    const ok = r.status >= 200 && r.status < 300;
    await remember(r.status, ok ? '' : r.body);
    if (!ok) console.error('api/lead: Big Boss respondeu', r.status, r.body);
    return json(ok ? { ok } : { error: `bigboss_${r.status}` }, ok ? 200 : 502, headers);
  } catch (err) {
    console.error('api/lead: falha ao contactar o Big Boss', err);
    await remember(-1, (err as Error).message);
    return json({ error: 'upstream' }, 502, headers);
  }
};
