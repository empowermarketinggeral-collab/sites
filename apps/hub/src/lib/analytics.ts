import { all, get } from './db';

// Eventos que contam como conversão (ex.: data-track="lead" no botão de contacto).
export const CONVERSION_EVENTS = ['lead', 'contacto', 'agendamento', 'compra'];
// "checkout" (clique para a Hotmart) é intenção de compra: aparece no funil, não conta como conversão.
const EVENT_LABELS: Record<string, string> = {
  lead: 'Inscrição (formulário)',
  contacto: 'Contacto',
  agendamento: 'Agendamento',
  compra: 'Compra',
  checkout: 'Abriu o checkout',
};
export const eventLabel = (name: string) => EVENT_LABELS[name] ?? name.replace(/_/g, ' ');

const TZ = 'Europe/Lisbon';
const DAY = 86_400_000;
const MAX_PAGE_TIME_MS = 30 * 60 * 1000;

export interface Range { from: number; to: number }
export interface Periods { days: number; current: Range; previous: Range }

export function periods(days: number, now = Date.now()): Periods {
  const to = now;
  const from = to - days * DAY;
  return { days, current: { from, to }, previous: { from: from - days * DAY, to: from } };
}

interface Row {
  site_id: string; session_id: string; visitor_id: string; ts: number; name: string; path: string; entry: number;
  channel: string; source: string; utm_campaign: string; country: string; city: string; device: string; title: string; detail: string;
}

function rows(siteId: string, r: Range): Promise<Row[]> {
  const where = siteId === 'all' ? '' : 'AND site_id = ?';
  const args = siteId === 'all' ? [r.from, r.to] : [r.from, r.to, siteId];
  return all<Row>(
    `SELECT site_id, session_id, visitor_id, ts, name, path, entry, channel, source, utm_campaign, country, city, device, title, detail
     FROM hub.events WHERE ts >= ? AND ts < ? ${where} ORDER BY ts`,
    args,
  );
}

interface Session {
  id: string; site: string; start: number; end: number; pageviews: number; events: string[]; views: Row[]; actions: Row[];
  landing: string; channel: string; source: string; campaign: string; country: string; city: string; device: string;
}

function sessions(list: Row[]): Session[] {
  const map = new Map<string, Session>();
  for (const e of list) {
    let s = map.get(e.session_id);
    if (!s) {
      s = {
        id: e.session_id, site: e.site_id, start: e.ts, end: e.ts, pageviews: 0, events: [], views: [], actions: [], landing: e.path,
        channel: e.channel, source: e.source, campaign: e.utm_campaign, country: e.country, city: e.city, device: e.device,
      };
      map.set(e.session_id, s);
    }
    s.end = e.ts;
    if (e.entry) s.landing = e.path;
    if (e.name === 'pageview') {
      s.pageviews++;
      s.views.push(e);
    } else {
      s.events.push(e.name);
      s.actions.push(e);
    }
  }
  return [...map.values()];
}

const converted = (s: Session) => s.events.some((e) => CONVERSION_EVENTS.includes(e));

export interface Kpis { sessions: number; visitors: number; pageviews: number; bounceRate: number; avgDuration: number; conversions: number; conversionRate: number }

function kpis(list: Row[], ss: Session[]): Kpis {
  const bounced = ss.filter((s) => s.pageviews <= 1 && s.events.length === 0).length;
  const conv = ss.filter(converted).length;
  const duration = ss.reduce((sum, s) => sum + (s.end - s.start), 0);
  return {
    sessions: ss.length,
    visitors: new Set(list.map((e) => e.visitor_id)).size,
    pageviews: list.filter((e) => e.name === 'pageview').length,
    bounceRate: ss.length ? (bounced / ss.length) * 100 : 0,
    avgDuration: ss.length ? duration / ss.length / 1000 : 0,
    conversions: conv,
    conversionRate: ss.length ? (conv / ss.length) * 100 : 0,
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

async function load(siteId: string, days: number) {
  const p = periods(days);
  const [curRows, prevRows] = await Promise.all([rows(siteId, p.current), rows(siteId, p.previous)]);
  return { p, curRows, prevRows, cur: sessions(curRows), prev: sessions(prevRows) };
}

// Título mais recente de cada página (eventos antigos não têm título).
function titles(list: Row[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of list) if (e.title) m.set(`${e.site_id}${e.path}`, e.title);
  return m;
}

export async function report(siteId: string, days: number) {
  const { p, curRows, prevRows, cur, prev } = await load(siteId, days);

  const funnelStep = (ss: Session[]) => [
    ss.length,
    ss.filter((s) => s.pageviews > 1 || s.events.length > 0).length,
    ss.filter(converted).length,
  ];
  const viewsBy = (list: Row[]) =>
    list.filter((e) => e.name === 'pageview').reduce((m, e) => m.set(e.path, (m.get(e.path) ?? 0) + 1), new Map<string, number>());
  const curViews = viewsBy(curRows);
  const prevViews = viewsBy(prevRows);
  const names = new Map([...titles(curRows)].map(([k, v]) => [k.slice(k.indexOf('/')), v]));
  const convBy = (ss: Session[]) => {
    const m = new Map<string, number>();
    for (const s of ss) for (const n of new Set(s.events.filter((e) => CONVERSION_EVENTS.includes(e)))) m.set(n, (m.get(n) ?? 0) + 1);
    return m;
  };
  const cc = convBy(cur);
  const pc = convBy(prev);
  // Páginas onde aconteceram conversões (uma por visita e página).
  const convPages = (ss: Session[]) => {
    const m = new Map<string, number>();
    for (const s of ss) for (const path of new Set(s.actions.filter((a) => CONVERSION_EVENTS.includes(a.name)).map((a) => a.path))) m.set(path, (m.get(path) ?? 0) + 1);
    return m;
  };
  const cp = convPages(cur);
  const pp = convPages(prev);

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
    topPages: [...curViews.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([path, current]) => ({ label: names.get(path) ? `${names.get(path)} (${path})` : path, current, previous: prevViews.get(path) ?? 0 })),
    conversionPages: [...cp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([path, current]) => ({ label: names.get(path) ?? path, current, previous: pp.get(path) ?? 0 })),
    byConversion: [...cc.entries()].sort((a, b) => b[1] - a[1]).map(([n, current]) => ({ label: eventLabel(n), current, previous: pc.get(n) ?? 0 })),
    funnel: { labels: ['Sessões', 'Interagiram', 'Converteram'], current: funnelStep(cur), previous: funnelStep(prev) },
  };
}

export type Report = Awaited<ReturnType<typeof report>>;

export function change(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

// Pessoas no site nos últimos 5 minutos (como o "Agora" da Shopify).
export async function liveNow(siteId: string): Promise<number> {
  const where = siteId === 'all' ? '' : 'AND site_id = ?';
  const args = siteId === 'all' ? [Date.now() - 5 * 60_000] : [Date.now() - 5 * 60_000, siteId];
  const r = await get<{ n: number }>(`SELECT count(DISTINCT session_id)::int AS n FROM hub.events WHERE ts >= ? ${where}`, args);
  return r?.n ?? 0;
}

// ---------- Páginas ----------

export interface PageRow {
  key: string; site: string; path: string; title: string; views: number; prevViews: number; visitors: number; entries: number;
  exits: number; avgTime: number; conversions: number; convSessions: number; viewSessions: number; actions: { label: string; count: number }[];
}

export async function pagesReport(siteId: string, days: number): Promise<PageRow[]> {
  const { curRows, prevRows, cur } = await load(siteId, days);
  const names = titles(curRows);
  const map = new Map<string, PageRow & { visitorSet: Set<string>; sessionSet: Set<string>; convSet: Set<string>; times: number[]; actionMap: Map<string, number> }>();
  const row = (site: string, path: string) => {
    const key = `${site}${path}`;
    let r = map.get(key);
    if (!r) {
      r = {
        key, site, path, title: names.get(key) ?? '', views: 0, prevViews: 0, visitors: 0, entries: 0, exits: 0, avgTime: 0, conversions: 0,
        convSessions: 0, viewSessions: 0, actions: [], visitorSet: new Set(), sessionSet: new Set(), convSet: new Set(), times: [], actionMap: new Map(),
      };
      map.set(key, r);
    }
    return r;
  };

  for (const s of cur) {
    s.views.forEach((v, i) => {
      const r = row(s.site, v.path);
      r.views++;
      r.visitorSet.add(v.visitor_id);
      r.sessionSet.add(s.id);
      if (i === 0) r.entries++;
      if (i === s.views.length - 1) r.exits++;
      const next = s.views[i + 1]?.ts ?? s.actions.filter((a) => a.ts > v.ts).at(-1)?.ts;
      if (next && next - v.ts < MAX_PAGE_TIME_MS) r.times.push(next - v.ts);
    });
    for (const a of s.actions) {
      const r = row(s.site, a.path);
      if (CONVERSION_EVENTS.includes(a.name)) {
        r.conversions++;
        r.convSet.add(s.id);
      }
      const label = a.detail ? `${eventLabel(a.name)}: ${a.detail}` : eventLabel(a.name);
      r.actionMap.set(label, (r.actionMap.get(label) ?? 0) + 1);
    }
  }
  for (const e of prevRows) if (e.name === 'pageview') row(e.site_id, e.path).prevViews++;

  return [...map.values()]
    .filter((r) => r.views > 0 || r.conversions > 0)
    .map(({ visitorSet, sessionSet, convSet, times, actionMap, ...r }) => ({
      ...r,
      visitors: visitorSet.size,
      viewSessions: sessionSet.size,
      convSessions: convSet.size,
      avgTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length / 1000 : 0,
      actions: [...actionMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
    }))
    .sort((a, b) => b.views - a.views);
}

// ---------- Conversões ----------

export interface ConversionPlace { key: string; site: string; path: string; title: string; name: string; detail: string; count: number; prev: number; viewSessions: number }
export interface RateRow { label: string; sessions: number; converted: number; prevSessions: number; prevConverted: number }
export interface RecentConversion { ts: number; site: string; name: string; detail: string; path: string; title: string; channel: string; source: string; campaign: string; city: string; device: string; leadId: string | null }

export async function conversionsReport(siteId: string, days: number) {
  const { p, curRows, cur, prev } = await load(siteId, days);
  const names = titles(curRows);

  // Formulário de cada inscrição: o evento "lead" nem sempre traz o nome; o lead guardado na mesma visita traz.
  const scope = siteId === 'all' ? '' : 'AND site_id = ?';
  const leadArgs = (r: Range) => (siteId === 'all' ? [r.from, r.to] : [r.from, r.to, siteId]);
  const [leads, prevLeads] = await Promise.all([
    all<{ id: string; site_id: string; ts: number; form: string; page: string; session_id: string; channel: string; source: string }>(
      `SELECT id, site_id, ts, form, page, session_id, channel, source FROM hub.leads WHERE ts >= ? AND ts < ? ${scope} ORDER BY ts`, leadArgs(p.current)),
    all<{ form: string }>(`SELECT form FROM hub.leads WHERE ts >= ? AND ts < ? ${scope}`, leadArgs(p.previous)),
  ]);
  const leadsBySession = new Map<string, typeof leads>();
  for (const l of leads) if (l.session_id) leadsBySession.set(l.session_id, [...(leadsBySession.get(l.session_id) ?? []), l]);
  const leadFor = (sessionId: string, ts: number) =>
    (leadsBySession.get(sessionId) ?? []).reduce<(typeof leads)[number] | null>((best, l) => (!best || Math.abs(l.ts - ts) < Math.abs(best.ts - ts) ? l : best), null);

  // Uma conversão por visita, tipo e página (cliques repetidos no mesmo botão não contam duas vezes).
  const conversions = (ss: Session[]) => {
    const out: (Row & { s: Session })[] = [];
    for (const s of ss) {
      const seen = new Set<string>();
      for (const a of s.actions) {
        if (!CONVERSION_EVENTS.includes(a.name)) continue;
        const k = `${a.name}|${a.path}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ ...a, detail: a.detail || (a.name === 'lead' ? leadFor(s.id, a.ts)?.form ?? '' : ''), s });
      }
    }
    return out;
  };
  const cc = conversions(cur);
  const pc = conversions(prev);

  const viewSessions = new Map<string, Set<string>>();
  for (const s of cur) for (const v of s.views) {
    const k = `${s.site}${v.path}`;
    if (!viewSessions.has(k)) viewSessions.set(k, new Set());
    viewSessions.get(k)!.add(s.id);
  }

  const placeMap = new Map<string, ConversionPlace & { details: Map<string, number> }>();
  for (const c of cc) {
    const key = `${c.site_id}${c.path}|${c.name}`;
    let r = placeMap.get(key);
    if (!r) {
      r = { key, site: c.site_id, path: c.path, title: names.get(`${c.site_id}${c.path}`) ?? '', name: c.name, detail: '', count: 0, prev: 0, viewSessions: viewSessions.get(`${c.site_id}${c.path}`)?.size ?? 0, details: new Map() };
      placeMap.set(key, r);
    }
    r.count++;
    if (c.detail) r.details.set(c.detail, (r.details.get(c.detail) ?? 0) + 1);
  }
  for (const c of pc) {
    const r = placeMap.get(`${c.site_id}${c.path}|${c.name}`);
    if (r) r.prev++;
  }
  const byPlace: ConversionPlace[] = [...placeMap.values()]
    .map(({ details, ...r }) => ({ ...r, detail: [...details.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d).slice(0, 3).join(', ') }))
    .sort((a, b) => b.count - a.count);

  const count = <T,>(list: T[], key: (x: T) => string) => list.reduce((m, x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1), new Map<string, number>());
  const rank = (c: Map<string, number>, pm: Map<string, number>) =>
    [...c.entries()].sort((a, b) => b[1] - a[1]).map(([label, current]) => ({ label, current, previous: pm.get(label) ?? 0 }));

  const rate = (key: (s: Session) => string | null): RateRow[] => {
    const m = new Map<string, RateRow>();
    const add = (ss: Session[], prevPeriod: boolean) => {
      for (const s of ss) {
        const k = key(s);
        if (k === null) continue;
        const r = m.get(k) ?? { label: k, sessions: 0, converted: 0, prevSessions: 0, prevConverted: 0 };
        if (prevPeriod) { r.prevSessions++; if (converted(s)) r.prevConverted++; } else { r.sessions++; if (converted(s)) r.converted++; }
        m.set(k, r);
      }
    };
    add(cur, false);
    add(prev, true);
    return [...m.values()].filter((r) => r.sessions > 0).sort((a, b) => b.converted - a.converted || b.sessions - a.sessions);
  };

  const funnel = (ss: Session[]) => [
    ss.length,
    ss.filter((s) => s.pageviews > 1 || s.events.length > 0).length,
    ss.filter((s) => s.events.includes('checkout') || converted(s)).length,
    ss.filter(converted).length,
  ];

  // Outros eventos (cliques com data-track que não são conversões), por página.
  const others = new Map<string, { label: string; path: string; site: string; count: number }>();
  for (const s of cur) for (const a of s.actions) {
    if (CONVERSION_EVENTS.includes(a.name) || a.name === 'checkout') continue;
    const k = `${a.site_id}${a.path}|${a.name}|${a.detail}`;
    const r = others.get(k) ?? { label: a.detail ? `${eventLabel(a.name)}: ${a.detail}` : eventLabel(a.name), path: a.path, site: a.site_id, count: 0 };
    r.count++;
    others.set(k, r);
  }

  const recent: RecentConversion[] = cc.slice(-25).reverse().map((c) => ({
    ts: c.ts, site: c.site_id, name: c.name, detail: c.detail, path: c.path, title: names.get(`${c.site_id}${c.path}`) ?? '',
    channel: c.s.channel, source: c.s.source, campaign: c.s.campaign, city: c.s.city, device: c.s.device,
    leadId: c.name === 'lead' ? leadFor(c.s.id, c.ts)?.id ?? null : null,
  }));

  return {
    periods: p,
    total: { current: cc.length, previous: pc.length },
    sessions: { current: cur.length, previous: prev.length },
    byType: rank(count(cc, (c) => eventLabel(c.name)), count(pc, (c) => eventLabel(c.name))),
    byForm: rank(count(leads, (l) => l.form), count(prevLeads, (l) => l.form)),
    formPages: leads.reduce((m, l) => (l.page ? m.set(l.form, new Set([...(m.get(l.form) ?? []), l.page])) : m), new Map<string, Set<string>>()),
    byPlace,
    byChannel: rate((s) => s.channel),
    bySource: rate((s) => `${s.channel} · ${s.source}`),
    byCampaign: rate((s) => s.campaign || null),
    byLanding: rate((s) => s.landing),
    funnel: { labels: ['Sessões', 'Interagiram', 'Checkout ou formulário', 'Converteram'], current: funnel(cur), previous: funnel(prev) },
    others: [...others.values()].sort((a, b) => b.count - a.count).slice(0, 30),
    recent,
  };
}

export type ConversionsReport = Awaited<ReturnType<typeof conversionsReport>>;
