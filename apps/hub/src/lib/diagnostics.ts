import { get, type Site } from './db';
import { hostMatches } from './sites';

// Diagnóstico do tracking de um site: se os eventos estão a chegar e, a pedido,
// se o código do hub está mesmo no HTML do site.

export interface Health { lastTs: number | null; events24h: number; sessions24h: number }

export async function trackingHealth(siteId: string): Promise<Health> {
  const since = Date.now() - 86_400_000;
  const [last, day] = await Promise.all([
    get<{ ts: number | null }>('SELECT max(ts) AS ts FROM hub.events WHERE site_id = ?', [siteId]),
    get<{ n: number; s: number }>('SELECT count(*)::int AS n, count(DISTINCT session_id)::int AS s FROM hub.events WHERE site_id = ? AND ts >= ?', [siteId, since]),
  ]);
  return { lastTs: last?.ts ?? null, events24h: day?.n ?? 0, sessions24h: day?.s ?? 0 };
}

export const ISSUE_TEXT: Record<string, string> = {
  dominio_diferente: 'Visitas recusadas porque vêm de um endereço que não é o registado',
  nome_de_evento_invalido: 'Eventos com nome inválido (só letras minúsculas, números e _)',
  site_desconhecido: 'Visitas com um data-site que não existe no hub',
};

export interface Check { ok: boolean | null; label: string; detail?: string }

const directive = (csp: string, name: string) =>
  csp.split(';').map((d) => d.trim().split(/\s+/)).find((parts) => parts[0]?.toLowerCase() === name)?.slice(1) ?? null;

// Abre a página inicial do site e procura o código do hub. `hubHost` é o endereço do hub.
export async function checkInstall(site: Site, hubHost: string): Promise<Check[]> {
  const checks: Check[] = [];
  let res: Response;
  try {
    res = await fetch(site.url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'EmpowerHub-Verificacao/1.0' } });
  } catch (e) {
    return [{ ok: false, label: `Não foi possível abrir ${site.url}`, detail: (e as Error).message }];
  }
  checks.push({ ok: res.ok, label: `O site responde (${res.status})` });
  const finalHost = new URL(res.url || site.url).hostname;
  checks.push(hostMatches(site, finalHost)
    ? { ok: true, label: `O endereço ${finalHost} é aceite pelo hub` }
    : { ok: false, label: `O site abre em ${finalHost}, que não está nos domínios registados (${site.domain || '—'})`, detail: `Se ${finalHost} também é deste site (ex.: domínio principal da loja ou de um mercado), acrescenta-o ao campo Domínio, separado por vírgula.` });

  const html = (await res.text()).slice(0, 2_000_000);
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*\/t\.js)(?:\?[^"']*)?["'][^>]*>/gi)];
  if (!tags.length) {
    checks.push({
      ok: false,
      label: 'Não encontrei o código do hub (t.js) no HTML da página inicial',
      detail: 'Cola o código de tracking antes de </head>. Em construtores como Wix ou Webflow, o código pode ser carregado depois por JavaScript e não aparecer aqui: confirma em "Último evento".',
    });
  } else {
    const tag = tags[0][0];
    const src = tags[0][1];
    const id = /\bdata-site=["']([^"']+)["']/i.exec(tag)?.[1] ?? '';
    let srcHost = '';
    try { srcHost = new URL(src, res.url || site.url).hostname; } catch { /* fica vazio */ }
    checks.push({ ok: true, label: `Código do hub encontrado (${srcHost || src})` });
    checks.push(id === site.id
      ? { ok: true, label: `data-site="${id}" bate com este site` }
      : { ok: false, label: id ? `O código usa data-site="${id}", mas o id deste site é "${site.id}"` : 'O código não tem data-site', detail: 'Copia outra vez o código de tracking deste site.' });
    if (srcHost && srcHost !== hubHost) checks.push({ ok: null, label: `O código aponta para ${srcHost} e estás a usar o hub em ${hubHost}`, detail: 'Não faz mal se forem o mesmo hub (ex.: domínio próprio e endereço do Vercel).' });
  }

  const csp = res.headers.get('content-security-policy') ?? '';
  if (csp && tags.length) {
    const host = new URL(tags[0][1], res.url || site.url).hostname;
    const allows = (list: string[] | null) => !list || list.some((v) => v === '*' || v.includes(host) || (v === "'self'" && host === finalHost));
    const scripts = directive(csp, 'script-src') ?? directive(csp, 'default-src');
    const connect = directive(csp, 'connect-src') ?? directive(csp, 'default-src');
    checks.push(allows(scripts) ? { ok: true, label: 'A política de segurança (CSP) do site deixa carregar o código' } : { ok: false, label: `A CSP do site bloqueia scripts de ${host}`, detail: `Acrescenta https://${host} a script-src.` });
    checks.push(allows(connect) ? { ok: true, label: 'A CSP deixa enviar as visitas ao hub' } : { ok: false, label: `A CSP do site bloqueia o envio para ${host}`, detail: `Acrescenta https://${host} a connect-src.` });
  }
  return checks;
}
