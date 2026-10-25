import type { Site } from './db';

// Microsoft Clarity: gravações de sessão e mapas de calor. O script carrega nos
// sites (só com consentimento de análise); aqui só guardamos o id do projeto
// para abrir o painel certo a partir do hub.
export function clarityLink(site: Pick<Site, 'clarity_id'>): string | null {
  return /^[a-z0-9]{4,20}$/i.test(site.clarity_id) ? `https://clarity.microsoft.com/projects/view/${site.clarity_id}/dashboard` : null;
}
