import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA } from './schema.mjs';

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


let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (!db) {
    const file = resolve(process.env.HUB_DB_FILE ?? import.meta.env.HUB_DB_FILE ?? './data/hub.db');
    mkdirSync(dirname(file), { recursive: true });
    db = new DatabaseSync(file);
    db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    db.exec(SCHEMA);
  }
  return db;
}

const TABLES = {
  sites: ['name', 'url', 'domain', 'repo', 'client_id'],
  clients: ['name', 'company', 'email', 'phone', 'notes'],
  domains: ['name', 'registrar', 'expires_at', 'site_id', 'notes'],
} as const;

export type Table = keyof typeof TABLES;

export function list<T>(table: Table): T[] {
  return getDb().prepare(`SELECT * FROM ${table} ORDER BY name COLLATE NOCASE`).all() as T[];
}

export function upsert(table: Table, form: FormData): void {
  const fields = TABLES[table];
  const id = String(form.get('id') || '') || slugOrUuid(table, String(form.get('name') ?? ''));
  const values = fields.map((f) => String(form.get(f) ?? '').trim().slice(0, 2000));
  // Só guardamos URLs http(s): evita links javascript: no painel.
  if (table === 'sites' && !/^https?:\/\//i.test(values[fields.indexOf('url' as never)])) throw new Error('URL inválido');
  const cols = ['id', ...fields].join(', ');
  const marks = ['?', ...fields.map(() => '?')].join(', ');
  const updates = fields.map((f) => `${f} = excluded.${f}`).join(', ');
  getDb()
    .prepare(`INSERT INTO ${table} (${cols}) VALUES (${marks}) ON CONFLICT(id) DO UPDATE SET ${updates}`)
    .run(id, ...values);
}

export function remove(table: Table, id: string): void {
  getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

// Os sites ficam com um id legível (usado no snippet de tracking); o resto usa UUID.
function slugOrUuid(table: Table, name: string): string {
  if (table !== 'sites') return randomUUID();
  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const taken = getDb().prepare('SELECT 1 FROM sites WHERE id = ?').get(slug);
  return slug && !taken ? slug : randomUUID();
}

export function daysUntil(date: string): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  return Number.isNaN(t) ? null : Math.ceil((t - Date.now()) / 86_400_000);
}
