// Gera dados de demonstração (site "demo") para ver o dashboard a funcionar.
// Uso: npm run seed:demo   ·   Apagar: npm run seed:demo -- --clear
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { SCHEMA } from '../src/lib/schema.mjs';

// Usa o Turso se TURSO_DATABASE_URL estiver definido; senão, o ficheiro local.
mkdirSync('./data', { recursive: true });
const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? `file:${process.env.HUB_DB_FILE ?? './data/hub.db'}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
await db.batch(SCHEMA, 'write');
await db.batch(["DELETE FROM events WHERE site_id = 'demo'", "DELETE FROM sites WHERE id = 'demo'"], 'write');
if (process.argv.includes('--clear')) { console.log('Dados demo apagados.'); process.exit(0); }

await db.execute("INSERT INTO sites (id, name, url, domain, repo) VALUES ('demo', 'Site Demo', 'https://example.com', 'example.com', '')");

const pick = (list) => { const total = list.reduce((s, [, w]) => s + w, 0); let r = Math.random() * total; for (const [v, w] of list) if ((r -= w) < 0) return v; return list[0][0]; };
const LOCATIONS = [[['PT', 'Lisboa'], 30], [['PT', 'Porto'], 20], [['PT', 'Almada'], 6], [['PT', ''], 12], [['BR', 'São Paulo'], 8], [['US', ''], 10], [['ES', 'Madrid'], 4], [['FR', 'Paris'], 3]];
const SOURCES = [[['Direto', 'direto'], 35], [['Pesquisa', 'google'], 25], [['Social', 'instagram'], 14], [['Social', 'facebook'], 5], [['Social', 'pinterest'], 3], [['Social', 'linkedin'], 4], [['IA', 'chatgpt'], 4], [['Pesquisa', 'bing'], 3], [['Referência', 'parceiro.pt'], 4], [['Email', 'newsletter'], 3]];
const PAGES = [['/', 50], ['/solucoes', 12], ['/mapa-de-crescimento', 10], ['/casos-de-estudo', 8], ['/blog/posicionamento-de-marca', 12], ['/contacto', 8]];
const DEVICES = [['Telemóvel', 55], ['Desktop', 42], ['Tablet', 3]];

const INSERT = `INSERT INTO events (site_id, ts, name, session_id, visitor_id, path, entry, channel, source, utm_campaign, country, city, device)
  VALUES ('demo', ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)`;
const batch = [];
const insert = { run: (...args) => batch.push({ sql: INSERT, args }) };
const DAY = 86_400_000;
const now = Date.now();
let n = 0;
for (let d = 90; d >= 0; d--) {
  const growth = 1 + (90 - d) / 60;
  const sessions = Math.round((3 + Math.random() * 5) * growth * (new Date(now - d * DAY).getDay() % 6 === 0 ? 0.6 : 1));
  for (let i = 0; i < sessions; i++) {
    const start = now - d * DAY - Math.random() * DAY;
    if (start > now) continue;
    const sid = createHash('sha1').update(`${d}-${i}-${Math.random()}`).digest('hex').slice(0, 22);
    const vid = createHash('sha1').update(`v${Math.floor(Math.random() * 400)}`).digest('hex').slice(0, 22);
    const [country, city] = pick(LOCATIONS);
    const [channel, source] = pick(SOURCES);
    const device = pick(DEVICES);
    const views = Math.random() < 0.45 ? 1 : 1 + Math.ceil(Math.random() * 4);
    let ts = start;
    for (let v = 0; v < views; v++) {
      insert.run(Math.round(ts), 'pageview', sid, vid, v === 0 ? pick(PAGES) : pick(PAGES), v === 0 ? 1 : 0, channel, source, country, city, device); n++;
      ts += 20_000 + Math.random() * 120_000;
    }
    if (views > 1 && Math.random() < 0.3) { insert.run(Math.round(ts), 'cta_click', sid, vid, '/contacto', 0, channel, source, country, city, device); n++; }
    if (views > 1 && Math.random() < 0.08) { insert.run(Math.round(ts + 5000), 'lead', sid, vid, '/contacto', 0, channel, source, country, city, device); n++; }
  }
}
await db.batch(batch, 'write');
console.log(`Site demo criado com ${n} eventos.`);
