import type { APIRoute } from 'astro';
import { list, type Site } from '../../lib/db';
import { periods } from '../../lib/analytics';
import { listLeads, toCsv } from '../../lib/backoffice';

// CSV com os mesmos filtros da página Leads (abre no Excel/Sheets; separador vírgula, UTF-8).
export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams;
  const sites = await list<Site>('sites');
  const siteId = sites.some((s) => s.id === q.get('site')) ? q.get('site')! : 'all';
  const days = Number(q.get('days')) || 0;
  const leads = await listLeads(
    {
      siteId,
      form: q.get('form') ?? '',
      status: q.get('status') ?? '',
      q: (q.get('q') ?? '').trim().slice(0, 100),
      from: days > 0 ? periods(days).current.from : undefined,
    },
    50_000,
  );
  const name = (id: string) => sites.find((s) => s.id === id)?.name ?? id;
  const file = `leads-${siteId}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(toCsv(leads, name), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}"` },
  });
};
