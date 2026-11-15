import { all } from './db';
import { kindOf } from './sales';

// Clientes como na Shopify: as pessoas de cada site, juntando os formulários
// (hub.leads) e a Hotmart (hub.sales) pelo email (ou pelo telefone, sem email).

export const SEGMENTS = [
  { id: '', label: 'Todas' },
  { id: 'compradoras', label: 'Compradoras' },
  { id: 'subscritoras', label: 'Aceitam emails' },
  { id: 'sem-compra', label: 'Inscritas sem compra' },
  { id: 'carrinho', label: 'Carrinho por recuperar' },
  { id: 'recorrentes', label: 'Compraram 2+ vezes' },
] as const;

interface LeadRow { id: string; site_id: string; ts: number; form: string; email: string; name: string; phone: string; company: string; consent_email: number; tags: string; status: string; channel: string; source: string; utm_campaign: string; page: string; city: string; session_id: string }
interface SaleRow { id: string; site_id: string; ts: number; kind: string; product_id: string; product_name: string; email: string; name: string; phone: string; value: number | null; currency: string; session_id: string; module: string }

export interface Customer {
  key: string; email: string; name: string; phone: string; company: string; sites: string[];
  firstTs: number; lastTs: number; forms: string[]; leads: number; consent: boolean; status: string;
  purchases: number; spent: number; currency: string; products: string[]; openCarts: number; refunds: number;
  origin: string; campaign: string; lastLeadId: string | null;
}

const keyOf = (email: string, phone: string) => (email ? email.toLowerCase() : phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '');

async function load(siteId: string, key?: string) {
  const scope = siteId === 'all' ? '' : 'AND site_id = ?';
  const args: (string | number)[] = siteId === 'all' ? [] : [siteId];
  let personFilter = '';
  if (key) {
    personFilter = key.startsWith('tel:') ? "AND phone <> '' AND email = ''" : 'AND email = ?';
    if (!key.startsWith('tel:')) args.push(key);
  }
  const [leads, sales] = await Promise.all([
    all<LeadRow>(`SELECT id, site_id, ts, form, email, name, phone, company, consent_email, tags, status, channel, source, utm_campaign, page, city, session_id FROM hub.leads WHERE 1 = 1 ${scope} ${personFilter} ORDER BY ts`, args),
    all<SaleRow>(`SELECT id, site_id, ts, kind, product_id, product_name, email, name, phone, value, currency, session_id, module FROM hub.sales WHERE 1 = 1 ${scope} ${personFilter} ORDER BY ts`, args),
  ]);
  const match = (r: { email: string; phone: string }) => !key || keyOf(r.email, r.phone) === key;
  return { leads: leads.filter(match), sales: sales.filter(match) };
}

function aggregate(leads: LeadRow[], sales: SaleRow[]): Customer[] {
  const map = new Map<string, Customer & { cartKeys: Set<string>; boughtKeys: Set<string>; currencies: Map<string, number> }>();
  const person = (email: string, phone: string, ts: number) => {
    const key = keyOf(email, phone);
    if (!key) return null;
    let c = map.get(key);
    if (!c) {
      c = {
        key, email: email.toLowerCase(), name: '', phone: '', company: '', sites: [], firstTs: ts, lastTs: ts, forms: [], leads: 0, consent: false,
        status: '', purchases: 0, spent: 0, currency: 'EUR', products: [], openCarts: 0, refunds: 0, origin: '', campaign: '', lastLeadId: null,
        cartKeys: new Set(), boughtKeys: new Set(), currencies: new Map(),
      };
      map.set(key, c);
    }
    c.firstTs = Math.min(c.firstTs, ts);
    c.lastTs = Math.max(c.lastTs, ts);
    return c;
  };
  for (const l of leads) {
    const c = person(l.email, l.phone, l.ts);
    if (!c) continue;
    c.leads++;
    c.name = l.name || c.name;
    c.phone = l.phone || c.phone;
    c.company = l.company || c.company;
    if (!c.sites.includes(l.site_id)) c.sites.push(l.site_id);
    if (!c.forms.includes(l.form)) c.forms.push(l.form);
    if (l.consent_email || l.tags.includes('newsletter:ativo')) c.consent = true;
    c.status = l.status;
    c.lastLeadId = l.id;
    if (!c.origin && l.channel) { c.origin = `${l.channel} · ${l.source}`; c.campaign = l.utm_campaign; }
  }
  for (const s of sales) {
    const c = person(s.email, s.phone, s.ts);
    if (!c) continue;
    c.name = c.name || s.name;
    c.phone = c.phone || s.phone;
    if (!c.sites.includes(s.site_id)) c.sites.push(s.site_id);
    const productKey = s.product_id || s.product_name;
    if (s.kind === 'compra') {
      c.purchases++;
      c.boughtKeys.add(productKey);
      if (s.product_name && !c.products.includes(s.product_name)) c.products.push(s.product_name);
      c.currencies.set(s.currency || 'EUR', (c.currencies.get(s.currency || 'EUR') ?? 0) + 1);
    }
    if (s.kind === 'reembolso') c.refunds++;
    if (s.kind === 'carrinho') c.cartKeys.add(productKey);
  }
  // Total gasto na moeda mais usada pela pessoa (compras menos reembolsos).
  for (const s of sales) {
    const c = map.get(keyOf(s.email, s.phone));
    if (!c) continue;
    const main = [...c.currencies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR';
    c.currency = main;
    if ((s.currency || 'EUR') !== main) continue;
    if (s.kind === 'compra') c.spent += s.value ?? 0;
    if (s.kind === 'reembolso') c.spent -= s.value ?? 0;
  }
  return [...map.values()].map(({ cartKeys, boughtKeys, currencies, ...c }) => ({
    ...c,
    openCarts: [...cartKeys].filter((k) => !boughtKeys.has(k)).length,
  }));
}

export function inSegment(c: Customer, segment: string): boolean {
  switch (segment) {
    case 'compradoras': return c.purchases > 0;
    case 'subscritoras': return c.consent;
    case 'sem-compra': return c.leads > 0 && c.purchases === 0;
    case 'carrinho': return c.openCarts > 0;
    case 'recorrentes': return c.purchases >= 2;
    default: return true;
  }
}

export async function listCustomers(siteId: string, opts: { segment?: string; q?: string; sort?: string } = {}) {
  const { leads, sales } = await load(siteId);
  const everyone = aggregate(leads, sales);
  const q = (opts.q ?? '').trim().toLowerCase();
  const list = everyone
    .filter((c) => inSegment(c, opts.segment ?? ''))
    .filter((c) => !q || [c.email, c.name, c.phone, c.company].some((v) => v.toLowerCase().includes(q)));
  const sorters: Record<string, (a: Customer, b: Customer) => number> = {
    recentes: (a, b) => b.lastTs - a.lastTs,
    gasto: (a, b) => b.spent - a.spent || b.lastTs - a.lastTs,
    pedidos: (a, b) => b.leads + b.purchases - (a.leads + a.purchases) || b.lastTs - a.lastTs,
    antigas: (a, b) => a.firstTs - b.firstTs,
  };
  list.sort(sorters[opts.sort ?? ''] ?? sorters.recentes);
  const counts = Object.fromEntries(SEGMENTS.map((s) => [s.id, everyone.filter((c) => inSegment(c, s.id)).length]));
  const currency = everyone.find((c) => c.purchases)?.currency ?? 'EUR';
  return {
    list,
    counts,
    total: everyone.length,
    revenue: everyone.filter((c) => c.currency === currency).reduce((t, c) => t + c.spent, 0),
    currency,
  };
}

export interface TimelineItem { ts: number; kind: string; label: string; detail: string; href: string | null; tone: string; site: string }

export async function customerDetail(siteId: string, key: string) {
  const { leads, sales } = await load(siteId, key);
  const [customer] = aggregate(leads, sales);
  if (!customer) return null;
  const items: TimelineItem[] = [
    ...leads.map((l) => ({ ts: l.ts, kind: 'lead', label: `Preencheu o formulário ${l.form}`, detail: [l.page && `em ${l.page}`, l.channel && `veio de ${l.channel} · ${l.source}`, l.utm_campaign && `campanha ${l.utm_campaign}`].filter(Boolean).join(', '), href: `/leads/${l.id}`, tone: '', site: l.site_id })),
    ...sales.map((s) => ({ ts: s.ts, kind: s.kind, label: `${kindOf(s.kind).label}: ${s.product_name || s.product_id}`, detail: [s.module, s.session_id && 'começou no site'].filter(Boolean).join(', '), href: `/vendas/${s.id}`, tone: kindOf(s.kind).tone, site: s.site_id })),
  ];
  // Visitas ao site ligadas a esta pessoa (as dos formulários e as dos checkouts).
  const sessionIds = [...new Set([...leads.map((l) => l.session_id), ...sales.map((s) => s.session_id)].filter(Boolean))];
  const visits = [];
  for (const id of sessionIds) {
    const ev = await all<{ ts: number; name: string; path: string; title: string; channel: string; source: string; utm_campaign: string; device: string; city: string }>(
      'SELECT ts, name, path, title, channel, source, utm_campaign, device, city FROM hub.events WHERE session_id = ? ORDER BY ts LIMIT 100', [id]);
    if (!ev.length) continue;
    visits.push({ id, start: ev[0].ts, events: ev });
    items.push({
      ts: ev[0].ts, kind: 'visita', label: `Visitou o site (${((n) => `${n} ${n === 1 ? 'página' : 'páginas'}`)(ev.filter((e) => e.name === 'pageview').length)})`,
      detail: `${ev[0].channel} · ${ev[0].source}${ev[0].utm_campaign ? `, campanha ${ev[0].utm_campaign}` : ''}, ${ev[0].device}${ev[0].city ? `, ${ev[0].city}` : ''}`, href: null, tone: '', site: '',
    });
  }
  items.sort((a, b) => b.ts - a.ts);
  return { customer, items, visits: visits.sort((a, b) => b.start - a.start) };
}

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function customersCsv(list: Customer[], siteName: (id: string) => string): string {
  const fmt = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeZone: 'Europe/Lisbon' });
  const head = ['Nome', 'Email', 'Telefone', 'Empresa/marca', 'Sites', 'Primeira vez', 'Última atividade', 'Formulários', 'Aceita emails', 'Compras', 'Total gasto', 'Moeda', 'Produtos', 'Carrinhos por recuperar', 'Reembolsos', 'Origem', 'Campanha', 'Estado'];
  const lines = list.map((c) => [
    c.name, c.email, c.phone, c.company, c.sites.map(siteName).join(' / '), fmt.format(c.firstTs), fmt.format(c.lastTs), c.forms.join(' / '),
    c.consent ? 'sim' : 'não', c.purchases, c.spent.toFixed(2), c.currency, c.products.join(' / '), c.openCarts, c.refunds, c.origin, c.campaign, c.status,
  ].map(csvCell).join(','));
  return '﻿' + [head.join(','), ...lines].join('\r\n');
}
