import type { APIRoute } from 'astro';
import { list, type Site } from '../../lib/db';
import { periods } from '../../lib/analytics';
import { listSales, salesCsv } from '../../lib/sales';

// CSV com os mesmos filtros da página Vendas.
export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams;
  const site = (await list<Site>('sites')).find((s) => s.id === q.get('site'));
  if (!site) return new Response('Site não encontrado', { status: 404 });
  const days = Number(q.get('days')) || 0;
  const sales = await listSales(
    { siteId: site.id, kind: q.get('kind') ?? '', product: q.get('product') ?? '', q: (q.get('q') ?? '').trim().slice(0, 100), from: days > 0 ? periods(days).current.from : undefined },
    50_000,
  );
  const file = `vendas-${site.id}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(salesCsv(sales), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${file}"` },
  });
};
