import { getDb } from './db';

// Eventos que contam como conversão (ex.: data-track="lead" no botão de contacto).
export const CONVERSION_EVENTS = ['lead', 'contacto', 'agendamento', 'compra'];
const TZ = 'Europe/Lisbon';
const DAY = 86_400_000;

export interface Range { from: number; to: number }
export interface Periods { days: number; current: Range; previous: Range }

export function periods(days: number, now = Date.now()): Periods {
  const to = now;
  const from = to - days * DAY;
  return { days, current: { from, to }, previous: { from: from - days * DAY, to: from } };
}

interface Row { session_id: string; visitor_id: string; ts: number; name: string; path: string; entry: number; channel: string; source: string; country: string; city: string; device: string }

function rows(siteId: string, r: Range): Row[] {
  const where = siteId === 'all' ? '' : 'AND site_id = ?';
  const args = siteId === 'all' ? [r.from, r.to] : [r.from, r.to, siteId];
  return getDb()
    .prepare(`SELECT session_id, visitor_id, ts, name, path, entry, channel, source, country, city, device FROM events WHERE ts >= ? AND ts < ? ${where} ORDER BY ts`)
    .all(...args) as unknown as Row[];
}

interface Session { id: string; start: number; end: number; pageviews: number; events: string[]; landing: string; channel: string; source: string; country: string; city: string; device: string }

function sessions(list: Row[]): Session[] {
  const map = new Map<string, Session>();
  for (const e of list) {
    let s = map.get(e.session_id);
    if (!s) {
      s = { id: e.session_id, start: e.ts, end: e.ts, pageviews: 0, events: [], landing: e.path, channel: e.channel, source: e.source, country: e.country, city: e.city, device: e.device };
      map.set(e.session_id, s);
    }
    s.end = e.ts;
    if (e.entry) s.landing = e.path;
    if (e.name === 'pageview') s.pageviews++;
    else s.events.push(e.name);
  }
  return [...map.values()];
}

export interface Kpis { sessions: number; visitors: number; pageviews: number; bounceRate: number; avgDuration: number; conversions: number; conversionRate: number }

function kpis(list: Row[], ss: Session[]): Kpis {
  const bounced = ss.filter((s) => s.pageviews <= 1 && s.events.length === 0).length;
  const converted = ss.filter((s) => s.events.some((e) => CONVERSION_EVENTS.includes(e))).length;
  const duration = ss.reduce((sum, s) => sum + (s.end - s.start), 0);
  return {
    sessions: ss.length,
    visitors: new Set(list.map((e) => e.visitor_id)).size,
    pageviews: list.filter((e) => e.name === 'pageview').length,
    bounceRate: ss.length ? (bounced / ss.length) * 100 : 0,
    avgDuration: ss.length ? duration / ss.length / 1000 : 0,
    conversions: converted,
    conversionRate: ss.length ? (converted / ss.length) * 100 : 0,
  };
}

export interface BreakdownRow { label: string; current: number; previous: number }

function breakdown(cur: Session[], prev: Session[], key: (s: Session) => string | null, limit = 5): BreakdownRow[] {
  const count = (ss: Session[]) => {
    const m = new Map<string, number>();
    for (const s of ss) {
      const k = key(s);
      if (k !== null) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const c = count(cur);
  const p = count(prev);
  return [...c.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, current]) => ({ label, current, previous: p.get(label) ?? 0 }));
}

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

function daily(ss: Session[], r: Range, days: number): { date: string; sessions: number }[] {
  const buckets = Array.from({ length: days }, (_, i) => ({ date: dayKey.format(r.from + (i + 1) * DAY - 1), sessions: 0 }));
  const index = new Map(buckets.map((b, i) => [b.date, i]));
  for (const s of ss) {
    const i = index.get(dayKey.format(s.start));
    if (i !== undefined) buckets[i].sessions++;
  }
  return buckets;
}

const COUNTRY = new Intl.DisplayNames(['pt-PT'], { type: 'region' });
function countryName(code: string): string {
  if (!code || code === 'XX') return 'Desconhecido';
  try { return COUNTRY.of(code.toUpperCase()) ?? code; } catch { return code; }
}

export function report(siteId: string, days: number) {
  const p = periods(days);
  const curRows = rows(siteId, p.current);
  const prevRows = rows(siteId, p.previous);
  const cur = sessions(curRows);
  const prev = sessions(prevRows);

  const funnelStep = (ss: Session[]) => [
    ss.length,
    ss.filter((s) => s.pageviews > 1 || s.events.length > 0).length,
    ss.filter((s) => s.events.some((e) => CONVERSION_EVENTS.includes(e))).length,
  ];

  return {
    periods: p,
    kpis: { current: kpis(curRows, cur), previous: kpis(prevRows, prev) },
    timeseries: { current: daily(cur, p.current, days), previous: daily(prev, p.previous, days) },
    byLocation: breakdown(cur, prev, (s) => `${countryName(s.country)} · ${s.city || 'Nenhum'}`),
    byReferrer: breakdown(cur, prev, (s) => `${s.channel} · ${s.source}`),
    bySocial: breakdown(cur, prev, (s) => (s.channel === 'Social' ? s.source : null)),
    byLanding: breakdown(cur, prev, (s) => s.landing, 8),
    byChannel: breakdown(cur, prev, (s) => s.channel, 8),
    byDevice: breakdown(cur, prev, (s) => s.device, 3),
    funnel: { labels: ['Sessões', 'Interagiram', 'Converteram'], current: funnelStep(cur), previous: funnelStep(prev) },
  };
}

export type Report = ReturnType<typeof report>;

export function change(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}
