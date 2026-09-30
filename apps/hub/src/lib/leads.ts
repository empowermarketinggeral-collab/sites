// Ligação dos sites ao Big Boss (função lead-intake). O token de cada site vive
// só em variáveis de ambiente: BIGBOSS_LEAD_URL e LEAD_TOKEN_<ID_DO_SITE>.

export const tokenEnvKey = (siteId: string) => `LEAD_TOKEN_${siteId.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

export function leadConfig(siteId: string) {
  return { endpoint: process.env.BIGBOSS_LEAD_URL?.trim() ?? '', token: process.env[tokenEnvKey(siteId)]?.trim() ?? '' };
}

export async function postToBigBoss(siteId: string, data: unknown): Promise<{ status: number; body: string }> {
  const { endpoint, token } = leadConfig(siteId);
  if (!endpoint || !token) return { status: 0, body: 'not_configured' };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-lead-token': token },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, body: (await res.text()).slice(0, 300) };
}

// Teste sem criar contactos: um pedido vazio é recusado com 422 ("indica um
// email") só depois de o token ser aceite. Traduz a resposta para português.
export async function probeBigBoss(siteId: string): Promise<{ ok: boolean; message: string }> {
  const { endpoint, token } = leadConfig(siteId);
  if (!endpoint) return { ok: false, message: 'Falta a variável BIGBOSS_LEAD_URL no Vercel (projeto do hub).' };
  if (!token) return { ok: false, message: `Falta a variável ${tokenEnvKey(siteId)} no Vercel (projeto do hub).` };
  if (!/^https?:\/\/[^/]+\/(functions\/v1\/)?lead-intake\/?$/.test(endpoint)) {
    return { ok: false, message: 'BIGBOSS_LEAD_URL não parece o endereço da função (deve acabar em /functions/v1/lead-intake).' };
  }
  let r;
  try {
    r = await postToBigBoss(siteId, {});
  } catch (e) {
    return { ok: false, message: `Não foi possível contactar o Big Boss (${(e as Error).message}).` };
  }
  if (r.status === 422) return { ok: true, message: 'Ligação OK: o Big Boss aceitou o token.' };
  if (r.status === 401 && r.body.includes('Token inválido')) {
    return { ok: false, message: 'O Big Boss recusou o token: confirma que é o de CRM → Entrada de leads e que a entrada está ligada.' };
  }
  if (r.status === 401) return { ok: false, message: 'O Supabase pede login: desliga "Verify JWT" na função lead-intake (Edge Functions).' };
  if (r.status === 404) return { ok: false, message: 'A função lead-intake não existe nesse endereço: confirma BIGBOSS_LEAD_URL e se a função foi publicada no Supabase.' };
  return { ok: false, message: `Resposta inesperada do Big Boss: ${r.status} ${r.body}` };
}
