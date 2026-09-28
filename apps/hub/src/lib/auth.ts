import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { get, run } from './db';

export const SESSION_COOKIE = 'hub_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function env(name: string): string {
  const value = process.env[name] ?? import.meta.env[name];
  if (!value) throw new Error(`Falta a variável de ambiente ${name}`);
  return value;
}

export function verifyPassword(password: string): boolean {
  const [salt, expected] = env('HUB_PASSWORD_HASH').split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, 'hex');
  return expectedBuf.length === actual.length && timingSafeEqual(actual, expectedBuf);
}

function sign(payload: string): string {
  return createHmac('sha256', env('HUB_SESSION_SECRET')).update(payload).digest('base64url');
}

export function createSession(): { token: string; maxAge: number } {
  const payload = String(Date.now() + SESSION_TTL_MS);
  return { token: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_MS / 1000 };
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(payload) > Date.now();
}

// Limite de tentativas de login por IP, guardado na base de dados (funciona em serverless).
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function isLocked(ip: string): Promise<boolean> {
  const a = await get<{ count: number; until: number }>('SELECT count, until FROM hub.login_attempts WHERE ip = ?', [ip]);
  return !!a && a.count >= MAX_ATTEMPTS && a.until > Date.now();
}

export async function recordFailure(ip: string): Promise<void> {
  const now = Date.now();
  await run(
    `INSERT INTO hub.login_attempts AS la (ip, count, until) VALUES (?, 1, ?)
     ON CONFLICT (ip) DO UPDATE SET count = CASE WHEN la.until < ? THEN 1 ELSE la.count + 1 END, until = excluded.until`,
    [ip, now + LOCK_MS, now],
  );
}

export async function clearFailures(ip: string): Promise<void> {
  await run('DELETE FROM hub.login_attempts WHERE ip = ?', [ip]);
}
