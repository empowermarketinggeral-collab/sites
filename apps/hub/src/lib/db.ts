import { randomUUID } from 'node:crypto';
import { connect, migrate } from './schema.mjs';

export interface Site {
  id: string;
  name: string;
  url: string;
  domain: string;
  repo: string;
  client_id: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
}

export interface Domain {
  id: string;
  name: string;
  registrar: string;
  expires_at: string;
  site_id: string;
  notes: string;
}

function env(name: string): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}

type Value = string | number | null;
interface Conn { query(sql: string, params?: Value[]): Promise<Record<string, unknown>[]> }

let conn: Promise<Conn> | undefined;

// Supabase em produção (POSTGRES_URL, criado pela integração do Vercel); Postgres local em ficheiro no desenvolvimento.
function db(): Promise<Conn> {
  conn ??= (async () => {
    const c: Conn = await connect({ url: env('POSTGRES_URL') ?? env('DATABASE_URL'), localDir: env('HUB_DB_DIR') ?? './data/pglite' });
    await migrate(c);
    return c;
  })();
  return conn;
}

export async function all<T>(sql: string, args: Value[] = []): Promise<T[]> {
  return (await (await db()).query(sql, args)) as T[];
}

export async function get<T>(sql: string, args: Value[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: Value[] = []): Promise<void> {
  await (await db()).query(sql, args);
}

const TABLES = {
  sites: ['name', 'url', 'domain', 'repo', 'client_id'],
  clients: ['name', 'company', 'email', 'phone', 'notes'],
  domains: ['name', 'registrar', 'expires_at', 'site_id', 'notes'],
} as const;

export type Table = keyof typeof TABLES;

export function list<T>(table: Table): Promise<T[]> {
  return all<T>(`SELECT * FROM hub.${table} ORDER BY lower(name)`);
}

export async function upsert(table: Table, form: FormData): Promise<void> {
  const fields = TABLES[table];
  const id = String(form.get('id') || '') || (await slugOrUuid(table, String(form.get('name') ?? '')));
  const values = fields.map((f) => String(form.get(f) ?? '').trim().slice(0, 2000));
  // Só guardamos URLs http(s): evita links javascript: no painel.
  if (table === 'sites' && !/^https?:\/\//i.test(values[fields.indexOf('url' as never)])) throw new Error('URL inválido');
  const cols = ['id', ...fields].join(', ');
  const marks = ['?', ...fields.map(() => '?')].join(', ');
  const updates = fields.map((f) => `${f} = excluded.${f}`).join(', ');
  await run(`INSERT INTO hub.${table} (${cols}) VALUES (${marks}) ON CONFLICT(id) DO UPDATE SET ${updates}`, [id, ...values]);
}

export async function remove(table: Table, id: string): Promise<void> {
  await run(`DELETE FROM hub.${table} WHERE id = ?`, [id]);
}

// Os sites ficam com um id legível (usado no snippet de tracking); o resto usa UUID.
async function slugOrUuid(table: Table, name: string): Promise<string> {
  if (table !== 'sites') return randomUUID();
  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const taken = await get('SELECT 1 FROM hub.sites WHERE id = ?', [slug]);
  return slug && !taken ? slug : randomUUID();
}

export function daysUntil(date: string): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  return Number.isNaN(t) ? null : Math.ceil((t - Date.now()) / 86_400_000);
}
