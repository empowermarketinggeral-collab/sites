import { randomUUID } from 'node:crypto';
import { all, get, run } from './db';
import { visitorId } from './tracking';

// Back-office dos sites: guarda cada lead que chega por /api/lead, liga-o à
// visita que o originou (pelo mesmo hash diário do tracking) e regista o que
// o Big Boss respondeu.

export const STATUSES = [
  { id: 'novo', label: 'Novo' },
  { id: 'contactado', label: 'Contactado' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'descartado', label: 'Descartado' },
] as const;
export const statusLabel = (id: string) => STATUSES.find((s) => s.id === id)?.label ?? id;

export interface Lead {
  id: string;
  site_id: string;
  ts: number;
  updated_ts: number;
  form: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  tags: string;
  consent_email: number;
  payload: string;
  session_id: string;
  visitor_id: string;
  page: string;
  channel: string;
  source: string;
  utm_campaign: string;
  country: string;
  city: string;
  device: string;
  status: string;
  notes: string;
  bigboss_status: number;
  bigboss_error: string;
}

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000; // o botão "tentar de novo" dos sites reenvia o mesmo pedido
const SESSION_GAP_MS = 30 * 60 * 1000;

const text = (v: unknown, max = 200) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '');
const truthy = (v: unknown) => v === true || ['true', 'on', '1', 'yes', 'sim'].includes(String(v ?? '').trim().toLowerCase());

// Os mesmos nomes de campos que a função lead-intake do Big Boss aceita.
export function normalize(data: Record<string, unknown>) {
  const cf = (data.custom_fields && typeof data.custom_fields === 'object' ? data.custom_fields : {}) as Record<string, unknown>;
  const first = text(data.first_name, 100);
  const last = text(data.last_name, 100);
  const tags = (Array.isArray(data.tags) ? data.tags : String(data.tags ?? '').split(','))
    .map((t) => text(t, 60)).filter(Boolean).slice(0, 20);
  return {
    email: text(data.email).toLowerCase(),
    name: text(data.name) || text(data.nome) || text(data.full_name) || [first, last].filter(Boolean).join(' '),
    phone: text(data.phone, 40) || text(data.telefone, 40) || text(data.telemovel, 40) || text(data.whatsapp, 40),
    company: text(data.company) || text(data.empresa) || text(data.brand) || text(data.marca) || text(cf.marca) || text(cf.empresa),
    form: text(data.source, 80) || text(data.form, 80) || tags[0] || 'formulário',
    tags: tags.join(', '),
    consent: truthy(data.consent) || truthy(data.consent_email) || tags.includes('newsletter:ativo'),
  };
}

// Sessão do visitante no momento do envio (o pedido do formulário vem do mesmo browser e IP).
async function sessionOf(siteId: string, ip: string, ua: string) {
  const visitor = visitorId(siteId, ip, ua);
  const last = await get<{ session_id: string; path: string; channel: string; source: string; utm_campaign: string; country: string; city: string; device: string }>(
    `SELECT session_id, path, channel, source, utm_campaign, country, city, device FROM hub.events
     WHERE visitor_id = ? AND site_id = ? AND ts > ? AND name = 'pageview' ORDER BY ts DESC LIMIT 1`,
    [visitor, siteId, Date.now() - SESSION_GAP_MS],
  );
  return { visitor, ...last };
}

export async function saveLead(input: { siteId: string; data: Record<string, unknown>; ip: string; ua: string; country: string; city: string }): Promise<string> {
  const n = normalize(input.data);
  const now = Date.now();
  // Não guardamos o honeypot nem campos técnicos de envio.
  const { _honeypot, token, ...payload } = input.data;
  const body = JSON.stringify(payload).slice(0, 20_000);

  const dup = n.email
    ? await get<{ id: string }>('SELECT id FROM hub.leads WHERE site_id = ? AND email = ? AND form = ? AND ts > ? ORDER BY ts DESC LIMIT 1', [input.siteId, n.email, n.form, now - DUPLICATE_WINDOW_MS])
    : undefined;
  if (dup) {
    await run('UPDATE hub.leads SET updated_ts = ?, name = ?, phone = ?, company = ?, tags = ?, consent_email = ?, payload = ? WHERE id = ?',
      [now, n.name, n.phone, n.company, n.tags, n.consent ? 1 : 0, body, dup.id]);
    return dup.id;
  }

  const s = await sessionOf(input.siteId, input.ip, input.ua);
  const id = randomUUID();
  await run(
    `INSERT INTO hub.leads (id, site_id, ts, updated_ts, form, email, name, phone, company, tags, consent_email, payload,
       session_id, visitor_id, page, channel, source, utm_campaign, country, city, device)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, input.siteId, now, now, n.form, n.email, n.name, n.phone, n.company, n.tags, n.consent ? 1 : 0, body,
      s.session_id ?? '', s.visitor, s.path ?? '', s.channel ?? '', s.source ?? '', s.utm_campaign ?? '',
      s.country || input.country, s.city || input.city, s.device ?? '',
    ],
  );
  return id;
}

export async function setBigBossResult(id: string, status: number, error = ''): Promise<void> {
  await run('UPDATE hub.leads SET bigboss_status = ?, bigboss_error = ? WHERE id = ?', [status, error.slice(0, 300), id]);
}

export interface LeadFilter { siteId: string; form?: string; status?: string; q?: string; from?: number }

function where(f: LeadFilter): { sql: string; args: (string | number)[] } {
  const parts: string[] = [];
  const args: (string | number)[] = [];
  if (f.siteId !== 'all') { parts.push('site_id = ?'); args.push(f.siteId); }
  if (f.form) { parts.push('form = ?'); args.push(f.form); }
  if (f.status) { parts.push('status = ?'); args.push(f.status); }
  if (f.from) { parts.push('ts >= ?'); args.push(f.from); }
  if (f.q) {
    parts.push("(lower(email) LIKE ? OR lower(name) LIKE ? OR lower(company) LIKE ? OR phone LIKE ?)");
    const like = `%${f.q.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    args.push(like, like, like, like);
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', args };
}

export function listLeads(f: LeadFilter, limit = 500): Promise<Lead[]> {
  const w = where(f);
  return all<Lead>(`SELECT * FROM hub.leads ${w.sql} ORDER BY ts DESC LIMIT ${Math.min(limit, 50_000)}`, w.args);
}

export function leadById(id: string): Promise<Lead | undefined> {
  return get<Lead>('SELECT * FROM hub.leads WHERE id = ?', [id]);
}

export async function formsOf(siteId: string): Promise<string[]> {
  const rows = await all<{ form: string }>(
    `SELECT DISTINCT form FROM hub.leads ${siteId === 'all' ? '' : 'WHERE site_id = ?'} ORDER BY form`,
    siteId === 'all' ? [] : [siteId],
  );
  return rows.map((r) => r.form);
}

export interface LeadStats { total: number; unique: number; consent: number; failed: number; byForm: { label: string; current: number; previous: number }[] }

export async function leadStats(siteId: string, from: number, prevFrom: number): Promise<{ current: LeadStats; previous: LeadStats }> {
  const scope = siteId === 'all' ? '' : 'AND site_id = ?';
  const args = (a: number, b: number) => (siteId === 'all' ? [a, b] : [a, b, siteId]);
  const rows = (a: number, b: number) =>
    all<{ form: string; email: string; consent_email: number; bigboss_status: number }>(
      `SELECT form, email, consent_email, bigboss_status FROM hub.leads WHERE ts >= ? AND ts < ? ${scope}`, args(a, b));
  const [cur, prev] = await Promise.all([rows(from, Date.now() + 1), rows(prevFrom, from)]);
  const stats = (list: typeof cur): LeadStats => ({
    total: list.length,
    unique: new Set(list.map((l, i) => l.email || `sem-email-${i}`)).size,
    consent: list.filter((l) => l.consent_email).length,
    failed: list.filter((l) => l.bigboss_status !== 0 && (l.bigboss_status < 200 || l.bigboss_status >= 300)).length,
    byForm: [],
  });
  const count = (list: typeof cur) => list.reduce((m, l) => m.set(l.form, (m.get(l.form) ?? 0) + 1), new Map<string, number>());
  const c = count(cur);
  const p = count(prev);
  const current = stats(cur);
  current.byForm = [...c.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, current: n, previous: p.get(label) ?? 0 }));
  return { current, previous: stats(prev) };
}

export async function updateLead(id: string, status: string, notes: string): Promise<void> {
  if (!STATUSES.some((s) => s.id === status)) throw new Error('Estado inválido');
  await run('UPDATE hub.leads SET status = ?, notes = ?, updated_ts = ? WHERE id = ?', [status, notes.slice(0, 5000), Date.now(), id]);
}

export async function deleteLead(id: string): Promise<void> {
  await run('DELETE FROM hub.leads WHERE id = ?', [id]);
}

// Percurso: as páginas e eventos da sessão em que o formulário foi enviado.
export function journey(lead: Lead) {
  if (!lead.session_id) return Promise.resolve([]);
  return all<{ ts: number; name: string; path: string }>(
    'SELECT ts, name, path FROM hub.events WHERE session_id = ? AND site_id = ? ORDER BY ts LIMIT 200',
    [lead.session_id, lead.site_id],
  );
}

// Outros pedidos do mesmo email (no mesmo site ou noutros).
export function historyOf(lead: Lead): Promise<Lead[]> {
  if (!lead.email) return Promise.resolve([]);
  return all<Lead>('SELECT * FROM hub.leads WHERE email = ? AND id <> ? ORDER BY ts DESC LIMIT 50', [lead.email, lead.id]);
}

export function bigBossState(l: Pick<Lead, 'bigboss_status'>): { label: string; tone: 'good' | 'bad' | 'warn' } {
  if (l.bigboss_status >= 200 && l.bigboss_status < 300) return { label: 'No Big Boss', tone: 'good' };
  if (l.bigboss_status === 0) return { label: 'Só no hub', tone: 'warn' };
  return { label: 'Falhou envio', tone: 'bad' };
}

const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // impede fórmulas ao abrir no Excel/Sheets
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(leads: Lead[], siteName: (id: string) => string): string {
  const fmt = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon' });
  const head = ['Data', 'Site', 'Formulário', 'Nome', 'Email', 'Telefone', 'Empresa/marca', 'Consentimento email', 'Tags', 'Estado', 'Notas', 'Canal', 'Origem', 'Campanha', 'Página', 'País', 'Cidade', 'Dispositivo', 'Big Boss'];
  const lines = leads.map((l) => [
    fmt.format(l.ts), siteName(l.site_id), l.form, l.name, l.email, l.phone, l.company, l.consent_email ? 'sim' : 'não', l.tags,
    statusLabel(l.status), l.notes, l.channel, l.source, l.utm_campaign, l.page, l.country, l.city, l.device, bigBossState(l).label,
  ].map(csvCell).join(','));
  return '﻿' + [head.join(','), ...lines].join('\r\n');
}
