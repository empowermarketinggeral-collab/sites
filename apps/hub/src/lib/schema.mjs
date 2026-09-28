// Partilhado entre a app e os scripts (ex.: seed-demo).
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', domain TEXT NOT NULL DEFAULT '',
  repo TEXT NOT NULL DEFAULT '', client_id TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, registrar TEXT NOT NULL DEFAULT '', expires_at TEXT NOT NULL DEFAULT '',
  site_id TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  site_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
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
);
CREATE INDEX IF NOT EXISTS events_site_ts ON events (site_id, ts);
CREATE INDEX IF NOT EXISTS events_visitor ON events (visitor_id, ts);
`;
