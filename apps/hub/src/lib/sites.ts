import { get, type Site } from './db';

export function siteFor(id: string): Promise<Site | undefined> {
  return get<Site>('SELECT * FROM hub.sites WHERE id = ?', [id]);
}

export function hostMatches(site: Site, host: string): boolean {
  const domain = site.domain.replace(/^www\./, '').toLowerCase();
  const h = host.replace(/^www\./, '').toLowerCase();
  return !!domain && (h === domain || h.endsWith(`.${domain}`));
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
