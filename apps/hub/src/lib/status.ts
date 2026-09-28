export interface SiteStatus { up: boolean; status: number | null; ms: number | null }

export async function checkStatus(url: string): Promise<SiteStatus> {
  if (!url) return { up: false, status: null, ms: null };
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
    return { up: res.ok, status: res.status, ms: Date.now() - start };
  } catch {
    return { up: false, status: null, ms: null };
  }
}
