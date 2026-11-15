// Gera dados de demonstração (site "demo") para ver o dashboard a funcionar.
// Uso: npm run seed:demo   ·   Apagar: npm run seed:demo -- --clear
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { connect, migrate } from '../src/lib/schema.mjs';

// Usa o Supabase se POSTGRES_URL estiver definido; senão, o Postgres local em ficheiro.
mkdirSync('./data', { recursive: true });
const db = await connect({ url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL, localDir: process.env.HUB_DB_DIR ?? './data/pglite' });
await migrate(db);
await db.query("DELETE FROM hub.events WHERE site_id = 'demo'");
await db.query("DELETE FROM hub.leads WHERE site_id = 'demo'");
await db.query("DELETE FROM hub.sites WHERE id = 'demo'");
if (process.argv.includes('--clear')) { console.log('Dados demo apagados.'); await db.close(); process.exit(0); }

await db.query("INSERT INTO hub.sites (id, name, url, domain, repo) VALUES ('demo', 'Site Demo', 'https://example.com', 'example.com', '')");

const pick = (list) => { const total = list.reduce((s, [, w]) => s + w, 0); let r = Math.random() * total; for (const [v, w] of list) if ((r -= w) < 0) return v; return list[0][0]; };
const LOCATIONS = [[['PT', 'Lisboa'], 30], [['PT', 'Porto'], 20], [['PT', 'Almada'], 6], [['PT', ''], 12], [['BR', 'São Paulo'], 8], [['US', ''], 10], [['ES', 'Madrid'], 4], [['FR', 'Paris'], 3]];
const SOURCES = [[['Direto', 'direto'], 35], [['Pesquisa', 'google'], 25], [['Social', 'instagram'], 14], [['Social', 'facebook'], 5], [['Social', 'pinterest'], 3], [['Social', 'linkedin'], 4], [['IA', 'chatgpt'], 4], [['Pesquisa', 'bing'], 3], [['Referência', 'parceiro.pt'], 4], [['Email', 'newsletter'], 3]];
const PAGES = [['/', 50], ['/ebook-guia', 14], ['/curso-online', 12], ['/servicos', 10], ['/blog/posicionamento-de-marca', 12], ['/contacto', 8]];
const TITLES = { '/': 'Início | Site Demo', '/ebook-guia': 'E-book grátis: Guia de Posicionamento', '/curso-online': 'Curso Online de Marca', '/servicos': 'Serviços', '/blog/posicionamento-de-marca': 'Posicionamento de marca: o guia', '/contacto': 'Contacto' };
// Conversões possíveis em cada página: [evento, detalhe, probabilidade].
const GOALS = {
  '/ebook-guia': [['lead', 'ebook-guia', 0.22]],
  '/curso-online': [['checkout', 'Comprar o curso', 0.12], ['lead', 'lista-espera-curso', 0.06]],
  '/contacto': [['contacto', 'Falar no WhatsApp', 0.15], ['agendamento', 'Marcar reunião', 0.05]],
  '/blog/posicionamento-de-marca': [['guia_download', 'Descarregar PDF', 0.05]],
};
const CAMPAIGNS = [['', 70], ['lancamento-curso', 15], ['ebook-outubro', 15]];
const DEVICES = [['Telemóvel', 55], ['Desktop', 42], ['Tablet', 3]];

const batch = [];
const leads = [];
const insert = { run: (...args) => batch.push(args) };
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
    const campaign = channel === 'Social' || channel === 'Email' ? pick(CAMPAIGNS) : '';
    const device = pick(DEVICES);
    const views = Math.random() < 0.45 ? 1 : 1 + Math.ceil(Math.random() * 4);
    let ts = start;
    for (let v = 0; v < views; v++) {
      const path = pick(PAGES);
      insert.run(Math.round(ts), 'pageview', sid, vid, path, v === 0 ? 1 : 0, channel, source, campaign, country, city, device, TITLES[path], ''); n++;
      ts += 20_000 + Math.random() * 120_000;
      for (const [name, detail, p] of GOALS[path] ?? []) {
        if (Math.random() >= p) continue;
        ts += 5000;
        insert.run(Math.round(ts), name, sid, vid, path, 0, channel, source, campaign, country, city, device, TITLES[path], name === 'lead' ? '' : detail); n++;
        if (name === 'lead') leads.push([Math.round(ts), detail, sid, vid, path, channel, source, campaign, country, city, device]);
      }
    }
  }
}
// Insere em blocos de 200 linhas.
for (let i = 0; i < batch.length; i += 200) {
  const chunk = batch.slice(i, i + 200);
  const rows = chunk.map(() => "('demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(', ');
  await db.query(`INSERT INTO hub.events (site_id, ts, name, session_id, visitor_id, path, entry, channel, source, utm_campaign, country, city, device, title, detail) VALUES ${rows}`, chunk.flat());
}
// Leads fictícios para cada inscrição (o formulário vem no lead, não no evento, como nos sites reais).
const FIRST = ['Ana', 'Rita', 'Joana', 'Marta', 'Sofia', 'Inês', 'Carla', 'Beatriz', 'Patrícia', 'Diana'];
const LAST = ['Silva', 'Costa', 'Ferreira', 'Santos', 'Pereira', 'Lima', 'Rocha', 'Matos'];
for (const [i, [ts, form, sid, vid, path, channel, source, campaign, country, city, device]] of leads.entries()) {
  const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
  const email = `${name.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(' ', '.')}${i}@exemplo.pt`;
  await db.query(
    `INSERT INTO hub.leads (id, site_id, ts, updated_ts, form, email, name, consent_email, session_id, visitor_id, page, channel, source, utm_campaign, country, city, device, payload)
     VALUES ($1, 'demo', $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, '{}')`,
    [`demo-${i}`, ts, form, email, name, i % 3 === 0 ? 0 : 1, sid, vid, path, channel, source, campaign, country, city, device],
  );
}
await db.close();
console.log(`Site demo criado com ${n} eventos.`);
