import type { APIRoute } from 'astro';
import { list, type Site } from '../../lib/db';
import { customersCsv, listCustomers } from '../../lib/customers';

// CSV com os mesmos filtros da página Clientes.
export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams;
  const sites = await list<Site>('sites');
  const siteId = sites.some((s) => s.id === q.get('site')) ? q.get('site')! : 'all';
  const { list: people } = await listCustomers(siteId, { segment: q.get('segmento') ?? '', q: (q.get('q') ?? '').slice(0, 100), sort: q.get('ordem') ?? '' });
  const name = (id: string) => sites.find((s) => s.id === id)?.name ?? id;
  const file = `clientes-${siteId}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(customersCsv(people, name), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}"` },
  });
};
