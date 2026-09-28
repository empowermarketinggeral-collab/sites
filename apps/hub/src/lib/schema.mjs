// Partilhado entre a app e os scripts (ex.: seed-demo). Uma instrução por item.
// Tudo fica no schema privado "hub" (a API pública do Supabase só expõe "public"),
// e com RLS ativo sem políticas: só a ligação direta da app consegue ler/escrever.
const TABLES = ['sites', 'clients', 'domains', 'events', 'login_attempts'];

export const SCHEMA = [
  `CREATE SCHEMA IF NOT EXISTS hub`,
  `CREATE TABLE IF NOT EXISTS hub.sites (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', domain TEXT NOT NULL DEFAULT '',
    repo TEXT NOT NULL DEFAULT '', client_id TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS hub.clients (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS hub.domains (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, registrar TEXT NOT NULL DEFAULT '', expires_at TEXT NOT NULL DEFAULT '',
    site_id TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
  )`,
  // ts em milissegundos (double precision: número exato e lido como number pelos clientes).
  `CREATE TABLE IF NOT EXISTS hub.events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id TEXT NOT NULL,
    ts DOUBLE PRECISION NOT NULL,
    name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    path TEXT NOT NULL,
    entry INTEGER NOT NULL DEFAULT 0,
    channel TEXT NOT NULL,
    source TEXT NOT NULL,
    utm_campaign TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS events_site_ts ON hub.events (site_id, ts)`,
  `CREATE INDEX IF NOT EXISTS events_visitor ON hub.events (visitor_id, ts)`,
  `CREATE TABLE IF NOT EXISTS hub.login_attempts (
    ip TEXT PRIMARY KEY, count INTEGER NOT NULL, until DOUBLE PRECISION NOT NULL
  )`,
  ...TABLES.map((t) => `ALTER TABLE hub.${t} ENABLE ROW LEVEL SECURITY`),
];

// "?" → "$1, $2…" (as queries da app não usam "?" dentro de texto).
export function toPg(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

// Liga ao Postgres do Supabase (POSTGRES_URL) ou, sem ele, a um Postgres local em ficheiro (PGlite).
export async function connect({ url, localDir }) {
  if (url) {
    const { default: postgres } = await import('postgres');
    const u = new URL(url);
    u.search = ''; // o pooler do Supabase acrescenta parâmetros que o cliente não conhece
    const sql = postgres(u.toString(), { ssl: 'require', prepare: false, max: 3, idle_timeout: 20 });
    return {
      query: async (text, params = []) => [...(await sql.unsafe(toPg(text), params))],
      close: () => sql.end(),
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = await PGlite.create(localDir);
  return {
    query: async (text, params = []) => (await pg.query(toPg(text), params)).rows,
    close: () => pg.close(),
  };
}

export async function migrate(conn) {
  for (const stmt of SCHEMA) await conn.query(stmt);
}
