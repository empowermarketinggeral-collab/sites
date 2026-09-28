import { createHash, createHmac } from 'node:crypto';
import { get, run } from './db';

const SESSION_GAP_MS = 30 * 60 * 1000;

const SOCIAL: Record<string, string> = {
  'instagram.com': 'instagram', 'l.instagram.com': 'instagram', 'facebook.com': 'facebook', 'm.facebook.com': 'facebook',
  'l.facebook.com': 'facebook', 'lm.facebook.com': 'facebook', 'fb.com': 'facebook', 'tiktok.com': 'tiktok',
  'linkedin.com': 'linkedin', 'lnkd.in': 'linkedin', 'pinterest.com': 'pinterest', 'pin.it': 'pinterest',
  'x.com': 'x', 't.co': 'x', 'twitter.com': 'x', 'youtube.com': 'youtube', 'm.youtube.com': 'youtube', 'threads.net': 'threads',
};
const ALIASES: Record<string, string> = { ig: 'instagram', fb: 'facebook', li: 'linkedin', yt: 'youtube', tt: 'tiktok' };
const SEARCH = ['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia', 'yandex', 'baidu'];
const AI: Record<string, string> = {
  'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt', 'perplexity.ai': 'perplexity', 'claude.ai': 'claude',
  'gemini.google.com': 'gemini', 'copilot.microsoft.com': 'copilot',
};
const PAID_MEDIUMS = ['cpc', 'ppc', 'paid', 'paidsocial', 'paid_social', 'ads', 'display'];

export const CHANNELS = ['Direto', 'Pesquisa', 'Social', 'IA', 'Referência', 'Email', 'Pago'] as const;

export interface Attribution { channel: string; source: string; campaign: string }

export function classify(pageUrl: URL, referrer: string): Attribution {
  const utm = (k: string) => (pageUrl.searchParams.get(`utm_${k}`) ?? '').toLowerCase().slice(0, 100);
  const medium = utm('medium');
  const campaign = utm('campaign');
  let host = '';
  try { host = new URL(referrer).hostname.replace(/^www\./, ''); } catch { /* sem referenciador */ }
  if (host === pageUrl.hostname.replace(/^www\./, '')) host = '';

  const utmSource = ALIASES[utm('source')] ?? utm('source');
  const source = utmSource || SOCIAL[host] || AI[host] || SEARCH.find((s) => host.split('.').includes(s)) || host || 'direto';

  if (PAID_MEDIUMS.includes(medium)) return { channel: 'Pago', source, campaign };
  if (medium === 'email' || medium === 'newsletter') return { channel: 'Email', source, campaign };
  if (SOCIAL[host] || medium === 'social') return { channel: 'Social', source, campaign };
  if (AI[host]) return { channel: 'IA', source, campaign };
  if (SEARCH.some((s) => host.split('.').includes(s))) return { channel: 'Pesquisa', source, campaign };
  if (host) return { channel: 'Referência', source, campaign };
  return { channel: utmSource ? (Object.values(SOCIAL).includes(utmSource) ? 'Social' : 'Referência') : 'Direto', source, campaign };
}

export function deviceOf(ua: string): 'Desktop' | 'Telemóvel' | 'Tablet' | null {
  if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(ua)) return null;
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobi/i.test(ua))) return 'Tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'Telemóvel';
  return 'Desktop';
}

// Sem cookies: o visitante é um hash diário (IP + browser + site) que roda a cada dia.
export function visitorId(siteId: string, ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = createHmac('sha256', process.env.HUB_SESSION_SECRET ?? import.meta.env.HUB_SESSION_SECRET ?? '').update(day).digest();
  return createHash('sha256').update(salt).update(`${siteId}|${ip}|${ua}`).digest('base64url').slice(0, 22);
}

export interface TrackInput {
  siteId: string;
  name: string;
  url: URL;
  referrer: string;
  ip: string;
  ua: string;
  country: string;
  city: string;
  ts?: number;
}

export async function record(input: TrackInput): Promise<boolean> {
  const device = deviceOf(input.ua);
  if (!device) return false;
  const ts = input.ts ?? Date.now();
  const visitor = visitorId(input.siteId, input.ip, input.ua);

  const last = await get<{ session_id: string; channel: string; source: string; utm_campaign: string }>(
    'SELECT session_id, channel, source, utm_campaign FROM events WHERE visitor_id = ? AND site_id = ? AND ts > ? ORDER BY ts DESC LIMIT 1',
    [visitor, input.siteId, ts - SESSION_GAP_MS],
  );

  const attribution = last
    ? { channel: last.channel, source: last.source, campaign: last.utm_campaign }
    : classify(input.url, input.referrer);
  const session = last?.session_id ?? createHash('sha256').update(`${visitor}|${ts}`).digest('base64url').slice(0, 22);

  await run(
    `INSERT INTO events (site_id, ts, name, session_id, visitor_id, path, entry, channel, source, utm_campaign, country, city, device)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.siteId, ts, input.name, session, visitor, input.url.pathname.slice(0, 300), last ? 0 : 1,
      attribution.channel, attribution.source, attribution.campaign, input.country, input.city, device,
    ],
  );
  return true;
}
