import { get, run, type Site } from './db';

// Microsoft Clarity: gravações de sessão e mapas de calor. O script carrega nos
// sites (só com consentimento de análise); aqui guardamos o id do projeto para
// abrir o painel certo a partir do hub e, com um token da API de exportação de
// dados (Clarity → Settings → Data export), mostramos os números por página.
// Token por site em variável de ambiente: CLARITY_TOKEN_<ID_DO_SITE>.
// A API só devolve os últimos 1 a 3 dias e aceita poucos pedidos por dia por
// projeto: o hub guarda a resposta e só volta a pedir passadas algumas horas.

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const REFRESH_MS = 3 * 60 * 60 * 1000;
const MIN_FORCED_MS = 150 * 60 * 1000; // com o botão: no máximo ~9 pedidos por dia

const env = (name: string): string => String(process.env[name] ?? import.meta.env[name] ?? '').trim();
export const clarityTokenKey = (siteId: string) => `CLARITY_TOKEN_${siteId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

const validId = (id: string) => /^[a-z0-9]{4,20}$/i.test(id);

export function clarityLink(site: Pick<Site, 'clarity_id'>, view: 'dashboard' | 'recordings' | 'heatmaps' = 'dashboard'): string | null {
  return validId(site.clarity_id) ? `https://clarity.microsoft.com/projects/view/${site.clarity_id}/${view}` : null;
}

export interface ClarityPage {
  url: string; path: string; sessions: number; users: number; scroll: number | null; activeTime: number | null; totalTime: number | null;
  rage: number | null; dead: number | null; quickback: number | null; excessiveScroll: number | null; scriptErrors: number | null; errorClicks: number | null;
}
export interface ClarityData { fetchedAt: number; pages: ClarityPage[]; metrics: string[]; error: string | null }

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const pick = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const found = Object.keys(o).find((x) => x.toLowerCase() === k.toLowerCase());
    if (found !== undefined && o[found] !== undefined && o[found] !== null && o[found] !== '') return o[found];
  }
  return undefined;
};

// A resposta é uma lista de métricas ({ metricName, information: [...] }), cada linha com a dimensão (URL).
// Lemos os nomes sem distinguir maiúsculas e ignoramos o que não reconhecemos.
export function parseInsights(body: unknown): { pages: ClarityPage[]; metrics: string[] } {
  const list = Array.isArray(body) ? body : [];
  const pages = new Map<string, ClarityPage>();
  const page = (url: string) => {
    let p = pages.get(url);
    if (!p) {
      let path = url;
      try { path = new URL(url).pathname; } catch { /* fica o texto */ }
      p = { url, path, sessions: 0, users: 0, scroll: null, activeTime: null, totalTime: null, rage: null, dead: null, quickback: null, excessiveScroll: null, scriptErrors: null, errorClicks: null };
      pages.set(url, p);
    }
    return p;
  };
  const clicks: Record<string, keyof ClarityPage> = {
    rageclickcount: 'rage', deadclickcount: 'dead', quickbackclick: 'quickback', excessivescroll: 'excessiveScroll',
    scripterrorcount: 'scriptErrors', errorclickcount: 'errorClicks',
  };
  const metrics: string[] = [];
  for (const m of list) {
    if (!m || typeof m !== 'object') continue;
    const name = String((m as Record<string, unknown>).metricName ?? '');
    metrics.push(name);
    const info = (m as Record<string, unknown>).information;
    if (!Array.isArray(info)) continue;
    const key = name.toLowerCase();
    for (const row of info) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const url = String(pick(o, 'URL', 'Url', 'PageUrl') ?? '');
      if (!url) continue;
      const p = page(url);
      if (key === 'traffic') {
        p.sessions = num(pick(o, 'totalSessionCount', 'sessionsCount')) ?? p.sessions;
        p.users = num(pick(o, 'distinctUserCount')) ?? p.users;
      } else if (key === 'scrolldepth') {
        p.scroll = num(pick(o, 'averageScrollDepth', 'scrollDepth'));
      } else if (key === 'engagementtime') {
        p.activeTime = num(pick(o, 'activeTime'));
        p.totalTime = num(pick(o, 'totalTime'));
      } else if (clicks[key]) {
        (p as unknown as Record<string, number | null>)[clicks[key]] = num(pick(o, 'sessionsWithMetricPercentage'));
        if (!p.sessions) p.sessions = num(pick(o, 'sessionsCount')) ?? 0;
      }
    }
  }
  return { pages: [...pages.values()].sort((a, b) => b.sessions - a.sessions), metrics };
}

export function clarityConfigured(site: Site): boolean {
  return validId(site.clarity_id) && !!env(clarityTokenKey(site.id));
}

export async function clarityInsights(site: Site, force = false): Promise<ClarityData | null> {
  const token = env(clarityTokenKey(site.id));
  if (!token) return null;
  const cached = await get<{ ts: number; body: string }>("SELECT ts, body FROM hub.clarity_cache WHERE site_id = ? AND kind = 'url3'", [site.id]);
  const age = cached ? Date.now() - cached.ts : Infinity;
  const fromCache = (error: string | null): ClarityData | null => {
    if (!cached) return error ? { fetchedAt: 0, pages: [], metrics: [], error } : null;
    try { return { fetchedAt: cached.ts, ...parseInsights(JSON.parse(cached.body)), error }; } catch { return { fetchedAt: cached.ts, pages: [], metrics: [], error }; }
  };
  if (age < (force ? MIN_FORCED_MS : REFRESH_MS)) return fromCache(null);

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?numOfDays=3&dimension1=URL`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return fromCache(`Não foi possível contactar o Clarity (${(e as Error).message}).`);
  }
  if (res.status === 401 || res.status === 403) return fromCache('O Clarity recusou o token: gera um novo em Settings → Data export e atualiza a variável no Vercel.');
  if (res.status === 429) return fromCache('O Clarity atingiu o limite de pedidos de hoje: os números são os últimos guardados.');
  if (!res.ok) return fromCache(`Resposta inesperada do Clarity: ${res.status}.`);
  const text = (await res.text()).slice(0, 2_000_000);
  try { JSON.parse(text); } catch { return fromCache('O Clarity devolveu uma resposta que não é JSON.'); }
  await run(
    `INSERT INTO hub.clarity_cache (site_id, kind, ts, body) VALUES (?, 'url3', ?, ?)
     ON CONFLICT (site_id, kind) DO UPDATE SET ts = excluded.ts, body = excluded.body`,
    [site.id, Date.now(), text],
  );
  return { fetchedAt: Date.now(), ...parseInsights(JSON.parse(text)), error: null };
}
