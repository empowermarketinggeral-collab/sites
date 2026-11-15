import { all, get, normalizeDomain, run, type Site } from './db';

export { normalizeDomain };

export function siteFor(id: string): Promise<Site | undefined> {
  return get<Site>('SELECT * FROM hub.sites WHERE id = ?', [id]);
}

// Aceita o domínio registado e o endereço do site (ex.: o site ainda em …vercel.app), e os seus subdomínios.
export function hostMatches(site: Site, host: string): boolean {
  const h = normalizeDomain(host);
  return [site.domain, site.url].map(normalizeDomain).some((d) => !!d && (h === d || h.endsWith(`.${d}`)));
}

// Regista um pedido recusado (para o diagnóstico em Sites). No máximo uma escrita por minuto por motivo
// e, como o data-site e o endereço vêm do pedido, no máximo 300 motivos diferentes por hora.
const issueSeen = new Map<string, number>();
let issueWindow = 0;
export async function noteIssue(siteId: string, host: string, reason: string): Promise<void> {
  const key = `${siteId}|${host}|${reason}`;
  const now = Date.now();
  if (now - issueWindow > 3_600_000) { issueSeen.clear(); issueWindow = now; }
  if ((issueSeen.get(key) ?? 0) > now - 60_000) return;
  if (!issueSeen.has(key) && issueSeen.size >= 300) return;
  issueSeen.set(key, now);
  try {
    await run(
      `INSERT INTO hub.tracking_issues (site_id, host, reason, count, last_ts) VALUES (?, ?, ?, 1, ?)
       ON CONFLICT (site_id, host, reason) DO UPDATE SET count = hub.tracking_issues.count + 1, last_ts = excluded.last_ts`,
      [siteId.slice(0, 80), host.slice(0, 200), reason, now],
    );
  } catch { /* o diagnóstico nunca impede o tracking */ }
}

export interface TrackingIssue { site_id: string; host: string; reason: string; count: number; last_ts: number }
export function issuesOf(siteId: string): Promise<TrackingIssue[]> {
  return all<TrackingIssue>('SELECT * FROM hub.tracking_issues WHERE site_id = ? AND last_ts > ? ORDER BY last_ts DESC LIMIT 20', [siteId, Date.now() - 30 * 86_400_000]);
}
export function unknownSiteIssues(): Promise<TrackingIssue[]> {
  return all<TrackingIssue>("SELECT * FROM hub.tracking_issues WHERE reason = 'site_desconhecido' AND last_ts > ? ORDER BY last_ts DESC LIMIT 20", [Date.now() - 30 * 86_400_000]);
}

export function originMatches(site: Site, origin: string | null): boolean {
  return !!origin && URL.canParse(origin) && hostMatches(site, new URL(origin).hostname);
}

// Limite simples por IP, em memória (reinicia com cada instância).
export function rateLimiter(perMinute: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (ip: string): boolean => {
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || h.reset < now) {
      if (hits.size > 10_000) hits.clear();
      hits.set(ip, { count: 1, reset: now + 60_000 });
      return false;
    }
    return ++h.count > perMinute;
  };
}

export function clientIp(h: Headers, fallback: string | undefined): string {
  return h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? fallback ?? '';
}
