// Partilhado entre a app e os scripts (ex.: seed-demo). Uma instrução por item.
// Tudo fica no schema privado "hub" (a API pública do Supabase só expõe "public"),
// e com RLS ativo sem políticas: só a ligação direta da app consegue ler/escrever.
const TABLES = ['sites', 'clients', 'domains', 'events', 'leads', 'sales', 'login_attempts'];

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
  // Back-office: cada pedido de um formulário dos sites (guardado mesmo que o Big Boss falhe).
  // session_id/visitor_id ligam o lead às visitas (mesmo hash diário do tracking).
  // bigboss_status: código HTTP da resposta; 0 = sem token configurado; -1 = sem ligação.
  `CREATE TABLE IF NOT EXISTS hub.leads (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    ts DOUBLE PRECISION NOT NULL,
    updated_ts DOUBLE PRECISION NOT NULL,
    form TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    consent_email INTEGER NOT NULL DEFAULT 0,
    payload TEXT NOT NULL DEFAULT '{}',
    session_id TEXT NOT NULL DEFAULT '',
    visitor_id TEXT NOT NULL DEFAULT '',
    page TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    utm_campaign TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'novo',
    notes TEXT NOT NULL DEFAULT '',
    bigboss_status INTEGER NOT NULL DEFAULT 0,
    bigboss_error TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS leads_site_ts ON hub.leads (site_id, ts)`,
  `CREATE INDEX IF NOT EXISTS leads_email ON hub.leads (site_id, email)`,
  // Vendas e comportamentos da Hotmart, copiados do Big Boss (função hub-hotmart-feed).
  // id = id do evento no Big Boss. session_id liga a venda à visita quando o
  // checkout foi aberto a partir do site (sck=hub_<ref>, ver t.js).
  `CREATE TABLE IF NOT EXISTS hub.sales (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    ts DOUBLE PRECISION NOT NULL,
    event TEXT NOT NULL,
    kind TEXT NOT NULL,
    product_id TEXT NOT NULL DEFAULT '',
    product_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    transaction_id TEXT NOT NULL DEFAULT '',
    value DOUBLE PRECISION,
    currency TEXT NOT NULL DEFAULT '',
    payment_type TEXT NOT NULL DEFAULT '',
    installments INTEGER,
    offer TEXT NOT NULL DEFAULT '',
    recurrence INTEGER,
    src TEXT NOT NULL DEFAULT '',
    sck TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    module TEXT NOT NULL DEFAULT '',
    session_id TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS sales_site_ts ON hub.sales (site_id, ts)`,
  `CREATE INDEX IF NOT EXISTS sales_email ON hub.sales (email)`,
  // Colunas acrescentadas depois da primeira versão.
  `ALTER TABLE hub.sites ADD COLUMN IF NOT EXISTS bigboss_brand_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE hub.sites ADD COLUMN IF NOT EXISTS clarity_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE hub.events ADD COLUMN IF NOT EXISTS ref TEXT NOT NULL DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS events_ref ON hub.events (ref) WHERE ref <> ''`,
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
