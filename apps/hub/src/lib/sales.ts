import { all, get, run, type Site } from './db';

// Vendas e comportamentos da Hotmart no back-office. A Hotmart já envia tudo ao
// Big Boss (hotmart-webhook → hotmart_events); o hub copia de lá pela função
// hub-hotmart-feed. Variáveis no Vercel do hub:
//   HUB_FEED_SECRET              a mesma chave dos Edge Function Secrets do Big Boss
//   BIGBOSS_HOTMART_FEED_URL     opcional; por omissão é o BIGBOSS_LEAD_URL com
//                                /hub-hotmart-feed em vez de /lead-intake

export const KINDS = [
  { id: 'compra', label: 'Compra', tone: 'good' },
  { id: 'carrinho', label: 'Carrinho abandonado', tone: 'warn' },
  { id: 'pendente', label: 'Pagamento pendente', tone: 'warn' },
  { id: 'reembolso', label: 'Reembolso', tone: 'bad' },
  { id: 'cancelada', label: 'Compra cancelada', tone: 'bad' },
  { id: 'garantia', label: 'Fim da garantia', tone: 'good' },
  { id: 'acesso', label: 'Primeiro acesso ao curso', tone: 'good' },
  { id: 'modulo', label: 'Módulo concluído', tone: 'good' },
  { id: 'assinatura', label: 'Assinatura cancelada', tone: 'bad' },
  { id: 'outro', label: 'Outro', tone: '' },
] as const;

const EVENT_KIND: Record<string, string> = {
  PURCHASE_APPROVED: 'compra',
  PURCHASE_COMPLETE: 'garantia',
  PURCHASE_OUT_OF_SHOPPING_CART: 'carrinho',
  PURCHASE_BILLET_PRINTED: 'pendente',
  PURCHASE_DELAYED: 'pendente',
  PURCHASE_WAITING_PAYMENT: 'pendente',
  PURCHASE_REFUNDED: 'reembolso',
  PURCHASE_CHARGEBACK: 'reembolso',
  PURCHASE_PROTEST: 'reembolso',
  PURCHASE_CANCELED: 'cancelada',
  PURCHASE_EXPIRED: 'cancelada',
  CLUB_FIRST_ACCESS: 'acesso',
  CLUB_MODULE_COMPLETED: 'modulo',
  SUBSCRIPTION_CANCELLATION: 'assinatura',
};

export const kindOf = (id: string) => KINDS.find((k) => k.id === id) ?? KINDS[KINDS.length - 1];

export interface Sale {
  id: string;
  site_id: string;
  ts: number;
  event: string;
  kind: string;
  product_id: string;
  product_name: string;
  email: string;
  name: string;
  phone: string;
  transaction_id: string;
  value: number | null;
  currency: string;
  payment_type: string;
  installments: number | null;
  offer: string;
  recurrence: number | null;
  src: string;
  sck: string;
  country: string;
  module: string;
  session_id: string;
}

const env = (name: string): string => String(process.env[name] ?? import.meta.env[name] ?? '').trim();

function feedConfig() {
  const lead = env('BIGBOSS_LEAD_URL');
  const url = env('BIGBOSS_HOTMART_FEED_URL') || (lead ? lead.replace(/\/lead-intake\/?$/, '/hub-hotmart-feed') : '');
  return { url: url.includes('hub-hotmart-feed') ? url : '', secret: env('HUB_FEED_SECRET') };
}

export function salesConfigured(site: Site): string | null {
  if (!site.bigboss_brand_id) return 'Falta o id da marca no Big Boss (Sites → Editar).';
  const c = feedConfig();
  if (!c.url) return 'Falta BIGBOSS_LEAD_URL (ou BIGBOSS_HOTMART_FEED_URL) no Vercel do hub.';
  if (!c.secret) return 'Falta HUB_FEED_SECRET no Vercel do hub.';
  return null;
}

interface FeedEvent {
  id: string; created_at: string; event: string; product_id: string; product_name: string; email: string; name: string; phone: string;
  transaction: string; value: number | null; currency: string; payment_type: string; installments: number | null; offer: string;
  recurrence: number | null; src: string; sck: string; country: string; module: string;
}

const lastSync = new Map<string, number>();
const SYNC_EVERY_MS = 60_000;

// Copia os eventos novos do Big Boss. Devolve uma mensagem de erro, ou null.
export async function syncSales(site: Site, force = false): Promise<string | null> {
  const missing = salesConfigured(site);
  if (missing) return missing;
  if (!force && Date.now() - (lastSync.get(site.id) ?? 0) < SYNC_EVERY_MS) return null;
  lastSync.set(site.id, Date.now());

  const { url, secret } = feedConfig();
  const latest = await get<{ ts: number | null }>('SELECT max(ts) AS ts FROM hub.sales WHERE site_id = ?', [site.id]);
  let since = latest?.ts ? new Date(latest.ts).toISOString() : '1970-01-01T00:00:00Z';
  // Produtos sem nome no evento (ex.: acessos à área de membros) vão buscar o nome ao catálogo.
  const names = new Map<string, string>();

  for (let page = 0; page < 50; page++) {
    let res: Response;
    try {
      res = await fetch(`${url}?brand=${encodeURIComponent(site.bigboss_brand_id)}&since=${encodeURIComponent(since)}`, {
        headers: { 'x-hub-key': secret },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      return `Não foi possível contactar o Big Boss (${(e as Error).message}).`;
    }
    if (res.status === 401) return 'O Big Boss recusou a chave: confirma HUB_FEED_SECRET nos dois lados e "Verify JWT" desligado na função hub-hotmart-feed.';
    if (res.status === 404) return 'Função hub-hotmart-feed ou marca não encontradas no Big Boss.';
    if (!res.ok) return `Resposta inesperada do Big Boss: ${res.status}`;
    const body = (await res.json()) as { events: FeedEvent[]; products: { hotmart_product_id: string | null; name: string }[] };
    for (const p of body.products ?? []) if (p.hotmart_product_id) names.set(p.hotmart_product_id, p.name);

    for (const e of body.events) {
      const ref = e.sck.startsWith('hub_') ? e.sck.slice(4) : '';
      const session = ref ? await get<{ session_id: string }>('SELECT session_id FROM hub.events WHERE ref = ? AND site_id = ? LIMIT 1', [ref, site.id]) : undefined;
      await run(
        `INSERT INTO hub.sales (id, site_id, ts, event, kind, product_id, product_name, email, name, phone, transaction_id, value, currency,
           payment_type, installments, offer, recurrence, src, sck, country, module, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
        [
          e.id, site.id, Date.parse(e.created_at), e.event, EVENT_KIND[e.event] ?? 'outro', e.product_id ?? '',
          e.product_name || names.get(e.product_id) || '', e.email ?? '', e.name ?? '', e.phone ?? '', e.transaction ?? '', e.value,
          e.currency ?? '', e.payment_type ?? '', e.installments, e.offer ?? '', e.recurrence, e.src ?? '', e.sck ?? '', e.country ?? '',
          e.module ?? '', session?.session_id ?? '',
        ],
      );
    }
    if (body.events.length < 1000) break;
    since = body.events[body.events.length - 1].created_at;
  }
  return null;
}

export interface SaleFilter { siteId: string; kind?: string; product?: string; q?: string; from?: number }

export function listSales(f: SaleFilter, limit = 500): Promise<Sale[]> {
  const parts = ['site_id = ?'];
  const args: (string | number)[] = [f.siteId];
  if (f.kind) { parts.push('kind = ?'); args.push(f.kind); }
  if (f.product) { parts.push('product_name = ?'); args.push(f.product); }
  if (f.from) { parts.push('ts >= ?'); args.push(f.from); }
  if (f.q) {
    parts.push('(lower(email) LIKE ? OR lower(name) LIKE ? OR transaction_id LIKE ?)');
    const like = `%${f.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    args.push(like, like, like);
  }
  return all<Sale>(`SELECT * FROM hub.sales WHERE ${parts.join(' AND ')} ORDER BY ts DESC LIMIT ${Math.min(limit, 50_000)}`, args);
}

export async function productsOf(siteId: string): Promise<string[]> {
  return (await all<{ p: string }>("SELECT DISTINCT product_name AS p FROM hub.sales WHERE site_id = ? AND product_name <> '' ORDER BY p", [siteId])).map((r) => r.p);
}

export function saleById(id: string): Promise<Sale | undefined> {
  return get<Sale>('SELECT * FROM hub.sales WHERE id = ?', [id]);
}

// Tudo o que a mesma pessoa fez na Hotmart (deste site), do mais antigo para o mais recente.
export function timelineOf(sale: Sale): Promise<Sale[]> {
  if (!sale.email) return Promise.resolve([sale]);
  return all<Sale>('SELECT * FROM hub.sales WHERE site_id = ? AND email = ? ORDER BY ts', [sale.site_id, sale.email]);
}

export function salesByEmail(email: string): Promise<Sale[]> {
  if (!email) return Promise.resolve([]);
  return all<Sale>("SELECT * FROM hub.sales WHERE email = ? AND kind IN ('compra', 'reembolso', 'carrinho') ORDER BY ts DESC LIMIT 50", [email]);
}

export interface SalesStats {
  purchases: number; buyers: number; revenue: number; currency: string; refunds: number; refundValue: number;
  carts: number; recovered: number; fromSite: number; checkouts: number;
  byProduct: { label: string; current: number; previous: number }[];
  byChannel: { label: string; current: number; previous: number }[];
}

export async function salesStats(siteId: string, from: number, prevFrom: number): Promise<{ current: SalesStats; previous: SalesStats }> {
  const rows = (a: number, b: number) => all<Sale>('SELECT * FROM hub.sales WHERE site_id = ? AND ts >= ? AND ts < ?', [siteId, a, b]);
  const checkouts = (a: number, b: number) =>
    get<{ n: number }>("SELECT count(*)::int AS n FROM hub.events WHERE site_id = ? AND name = 'checkout' AND ts >= ? AND ts < ?", [siteId, a, b]);
  const now = Date.now() + 1;
  const [cur, prev, ckCur, ckPrev] = await Promise.all([rows(from, now), rows(prevFrom, from), checkouts(from, now), checkouts(prevFrom, from)]);

  // Canal de origem das vendas ligadas a uma visita (o canal da primeira página da sessão).
  const sessionIds = [...new Set([...cur, ...prev].map((s) => s.session_id).filter(Boolean))];
  const channels = new Map<string, string>();
  for (const id of sessionIds) {
    const e = await get<{ channel: string; source: string }>('SELECT channel, source FROM hub.events WHERE session_id = ? ORDER BY ts LIMIT 1', [id]);
    if (e) channels.set(id, `${e.channel} · ${e.source}`);
  }

  const currencyOf = (list: Sale[]) => {
    const m = new Map<string, number>();
    for (const s of list) if (s.kind === 'compra' && s.currency) m.set(s.currency, (m.get(s.currency) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'EUR';
  };
  const stats = (list: Sale[], ck: number): SalesStats => {
    const currency = currencyOf(list);
    const buys = list.filter((s) => s.kind === 'compra');
    const refunds = list.filter((s) => s.kind === 'reembolso');
    const carts = list.filter((s) => s.kind === 'carrinho');
    const bought = new Set(buys.map((s) => `${s.email}|${s.product_id}`));
    return {
      purchases: buys.length,
      buyers: new Set(buys.map((s, i) => s.email || `sem-email-${i}`)).size,
      revenue: buys.filter((s) => s.currency === currency).reduce((t, s) => t + (s.value ?? 0), 0),
      currency,
      refunds: refunds.length,
      refundValue: refunds.filter((s) => s.currency === currency).reduce((t, s) => t + (s.value ?? 0), 0),
      carts: carts.length,
      recovered: carts.filter((c) => bought.has(`${c.email}|${c.product_id}`)).length,
      fromSite: buys.filter((s) => s.session_id).length,
      checkouts: ck,
      byProduct: [],
      byChannel: [],
    };
  };
  const count = (list: Sale[], key: (s: Sale) => string | null) =>
    list.filter((s) => s.kind === 'compra').reduce((m, s) => { const k = key(s); if (k) m.set(k, (m.get(k) ?? 0) + 1); return m; }, new Map<string, number>());
  const rank = (c: Map<string, number>, p: Map<string, number>) =>
    [...c.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, current: n, previous: p.get(label) ?? 0 }));

  const current = stats(cur, ckCur?.n ?? 0);
  const productKey = (s: Sale) => s.product_name || s.product_id || 'Sem nome';
  const channelKey = (s: Sale) => (s.session_id ? channels.get(s.session_id) ?? 'Site' : s.src ? `Link · ${s.src}` : 'Sem ligação ao site');
  current.byProduct = rank(count(cur, productKey), count(prev, productKey));
  current.byChannel = rank(count(cur, channelKey), count(prev, channelKey));
  return { current, previous: stats(prev, ckPrev?.n ?? 0) };
}

export function money(value: number | null, currency: string): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency || 'EUR' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function salesCsv(list: Sale[]): string {
  const fmt = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon' });
  const head = ['Data', 'Tipo', 'Evento Hotmart', 'Produto', 'Nome', 'Email', 'Telefone', 'Valor', 'Moeda', 'Pagamento', 'Prestações', 'Transação', 'Oferta', 'src', 'sck', 'País', 'Módulo', 'Veio do site'];
  const lines = list.map((s) => [
    fmt.format(s.ts), kindOf(s.kind).label, s.event, s.product_name, s.name, s.email, s.phone, s.value ?? '', s.currency, s.payment_type,
    s.installments ?? '', s.transaction_id, s.offer, s.src, s.sck, s.country, s.module, s.session_id ? 'sim' : 'não',
  ].map(csvCell).join(','));
  return '﻿' + [head.join(','), ...lines].join('\r\n');
}
