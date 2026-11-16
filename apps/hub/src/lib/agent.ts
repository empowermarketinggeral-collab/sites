import { timingSafeEqual } from 'node:crypto';
import { list, type Site } from './db';
import { conversionsReport, eventLabel, liveNow, pagesReport, periods, report } from './analytics';
import { bigBossState, leadStats, listLeads, statusLabel } from './backoffice';
import { SEGMENTS, listCustomers } from './customers';
import { kindOf, listSales, salesConfigured, salesStats, syncSales } from './sales';
import { clarityInsights, clarityLink } from './clarity';
import { trackingHealth } from './diagnostics';

// Acesso dos agentes do Claude ao hub: um conector MCP só de leitura.
// Chave em HUB_AGENT_TOKEN (Vercel); o endereço do conector é /mcp/<chave>
// (ou /mcp com "Authorization: Bearer <chave>"). Ver README → Agentes do Claude.

const env = (name: string): string => String(process.env[name] ?? import.meta.env[name] ?? '').trim();

export function agentAuthorized(given: string): boolean {
  const expected = env('HUB_AGENT_TOKEN');
  if (expected.length < 24 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const clampDays = (v: unknown) => Math.min(365, Math.max(1, Math.round(Number(v) || 30)));
const clampLimit = (v: unknown, def = 50) => Math.min(500, Math.max(1, Math.round(Number(v) || def)));
const iso = (ts: number) => new Date(ts).toISOString();
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

async function siteOrThrow(id: unknown, allowAll = false): Promise<{ siteId: string; site?: Site; sites: Site[] }> {
  const sites = await list<Site>('sites');
  const want = String(id ?? (allowAll ? 'all' : '')).trim();
  if (allowAll && (want === '' || want === 'all')) return { siteId: 'all', sites };
  const site = sites.find((s) => s.id === want);
  if (!site) throw new Error(`Site desconhecido: "${want}". Sites: ${sites.map((s) => s.id).join(', ')}${allowAll ? ', all' : ''}.`);
  return { siteId: site.id, site, sites };
}

interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

const siteProp = (allowAll: boolean, ids: string[]) => ({
  type: 'string',
  description: allowAll ? 'Id do site (ver_sites) ou "all" para todos.' : 'Id do site (ver_sites).',
  ...(ids.length ? { enum: allowAll ? [...ids, 'all'] : ids } : {}),
});
const daysProp = { type: 'integer', minimum: 1, maximum: 365, description: 'Período em dias, até agora (ex.: 1, 7, 30, 90). Compara sempre com o período anterior do mesmo tamanho. Por omissão 30.' };
const limitProp = { type: 'integer', minimum: 1, maximum: 500, description: 'Máximo de linhas (por omissão 50).' };

export async function agentTools(): Promise<Tool[]> {
  const ids = (await list<Site>('sites')).map((s) => s.id);
  return [
    {
      name: 'ver_sites',
      title: 'Sites',
      description: 'Lista os sites do hub (id, nome, endereço, domínios) e o estado do tracking: último evento recebido, visitas das últimas 24 h, pessoas agora no site, se tem vendas Hotmart e Clarity ligados. Começa por aqui para saber os ids.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => {
        const sites = await list<Site>('sites');
        return Promise.all(sites.map(async (s) => {
          const h = await trackingHealth(s.id);
          return {
            id: s.id, nome: s.name, url: s.url, dominios: s.domain,
            ultimo_evento: h.lastTs ? iso(h.lastTs) : null, visitas_24h: h.sessions24h, eventos_24h: h.events24h,
            agora_no_site: await liveNow(s.id), vendas_hotmart_ligadas: !salesConfigured(s), clarity: clarityLink(s),
          };
        }));
      },
    },
    {
      name: 'ver_resumo',
      title: 'Resumo de um site',
      description: 'Indicadores de um site (ou de todos) num período, com o período anterior: sessões, visitantes, páginas vistas, rejeição, duração média, conversões e taxa, inscrições (leads) e vendas Hotmart; páginas mais vistas, conversões por tipo e onde se converte, canais e dispositivos.',
      inputSchema: { type: 'object', properties: { site: siteProp(true, ids), dias: daysProp }, additionalProperties: false },
      run: async (a) => {
        const { siteId, site } = await siteOrThrow(a.site, true);
        const days = clampDays(a.dias);
        const p = periods(days);
        const r = await report(siteId, days);
        const leads = await leadStats(siteId, p.current.from, p.previous.from);
        let vendas: unknown = null;
        if (site && !salesConfigured(site)) {
          await syncSales(site);
          const s = await salesStats(site.id, p.current.from, p.previous.from);
          vendas = {
            atual: { vendas: s.current.purchases, faturacao: round(s.current.revenue, 2), moeda: s.current.currency, compradoras: s.current.buyers, reembolsos: s.current.refunds, carrinhos_abandonados: s.current.carts, carrinhos_recuperados: s.current.recovered },
            anterior: { vendas: s.previous.purchases, faturacao: round(s.previous.revenue, 2), reembolsos: s.previous.refunds, carrinhos_abandonados: s.previous.carts },
            por_produto: s.current.byProduct, por_origem: s.current.byChannel,
          };
        }
        const k = (x: typeof r.kpis.current) => ({
          sessoes: x.sessions, visitantes: x.visitors, paginas_vistas: x.pageviews, taxa_rejeicao_pct: round(x.bounceRate),
          duracao_media_seg: Math.round(x.avgDuration), conversoes: x.conversions, taxa_conversao_pct: round(x.conversionRate, 2),
        });
        return {
          site: siteId, periodo: { de: iso(p.current.from), ate: iso(p.current.to), anterior_de: iso(p.previous.from) },
          atual: k(r.kpis.current), anterior: k(r.kpis.previous),
          inscricoes: { atual: leads.current.total, anterior: leads.previous.total, pessoas: leads.current.unique, aceitaram_emails: leads.current.consent, por_formulario: leads.current.byForm },
          vendas_hotmart: vendas,
          paginas_mais_vistas: r.topPages, conversoes_por_tipo: r.byConversion, onde_converte: r.conversionPages,
          canais: r.byChannel, origens: r.byReferrer, paginas_de_entrada: r.byLanding, dispositivos: r.byDevice, locais: r.byLocation,
        };
      },
    },
    {
      name: 'ver_paginas',
      title: 'Páginas',
      description: 'Todas as páginas vistas num período, com título: visualizações (e no período anterior), visitantes, entradas, saídas, tempo médio na página, conversões feitas na página e a taxa, e o que se clicou.',
      inputSchema: { type: 'object', properties: { site: siteProp(true, ids), dias: daysProp, limite: limitProp }, additionalProperties: false },
      run: async (a) => {
        const { siteId } = await siteOrThrow(a.site, true);
        const rows = await pagesReport(siteId, clampDays(a.dias));
        return rows.slice(0, clampLimit(a.limite)).map((p) => ({
          site: p.site, pagina: p.path, titulo: p.title, visualizacoes: p.views, visualizacoes_anterior: p.prevViews, visitantes: p.visitors,
          entradas: p.entries, saidas: p.exits, tempo_medio_seg: Math.round(p.avgTime), conversoes: p.conversions,
          taxa_conversao_pct: p.viewSessions ? round((p.convSessions / p.viewSessions) * 100, 2) : 0, cliques: p.actions,
        }));
      },
    },
    {
      name: 'ver_conversoes',
      title: 'Conversões',
      description: 'Onde e em quê se converteu: por página e tipo (inscrição, contacto, agendamento, compra) com o quê (formulário ou botão), inscrições por formulário, funil, taxa por página de entrada, outros cliques e as últimas conversões (com o id do lead).',
      inputSchema: { type: 'object', properties: { site: siteProp(true, ids), dias: daysProp }, additionalProperties: false },
      run: async (a) => {
        const { siteId } = await siteOrThrow(a.site, true);
        const c = await conversionsReport(siteId, clampDays(a.dias));
        const rate = (x: { converted: number; sessions: number }) => (x.sessions ? round((x.converted / x.sessions) * 100, 2) : 0);
        return {
          total: c.total, sessoes: c.sessions, por_tipo: c.byType, inscricoes_por_formulario: c.byForm,
          onde_converteram: c.byPlace.map((p) => ({ site: p.site, pagina: p.path, titulo: p.title, tipo: eventLabel(p.name), o_que: p.detail, quantas: p.count, anterior: p.prev, visitas_na_pagina: p.viewSessions })),
          funil: c.funnel,
          por_pagina_de_entrada: c.byLanding.slice(0, 30).map((l) => ({ pagina: l.label, sessoes: l.sessions, converteram: l.converted, taxa_pct: rate(l) })),
          outros_cliques: c.others,
          ultimas: c.recent.map((r) => ({ quando: iso(r.ts), site: r.site, tipo: eventLabel(r.name), o_que: r.detail, pagina: r.path, titulo: r.title, canal: r.channel, origem: r.source, campanha: r.campaign, cidade: r.city, dispositivo: r.device, lead_id: r.leadId })),
        };
      },
    },
    {
      name: 'ver_origens',
      title: 'Origens',
      description: 'Sessões, conversões e taxa de conversão por canal, por origem (canal · fonte) e por campanha (utm_campaign), com as sessões do período anterior.',
      inputSchema: { type: 'object', properties: { site: siteProp(true, ids), dias: daysProp }, additionalProperties: false },
      run: async (a) => {
        const { siteId } = await siteOrThrow(a.site, true);
        const c = await conversionsReport(siteId, clampDays(a.dias));
        const map = (rows: typeof c.byChannel) => rows.slice(0, 40).map((r) => ({
          origem: r.label, sessoes: r.sessions, sessoes_anterior: r.prevSessions, converteram: r.converted, taxa_pct: r.sessions ? round((r.converted / r.sessions) * 100, 2) : 0,
        }));
        return { por_canal: map(c.byChannel), por_origem: map(c.bySource), por_campanha: map(c.byCampaign) };
      },
    },
    {
      name: 'ver_leads',
      title: 'Leads',
      description: 'Pessoas que preencheram formulários dos sites: nome, email, telefone, empresa, formulário, consentimento de emails, estado e notas, de onde vieram (canal, campanha, página, cidade) e se chegaram ao Big Boss. Dados pessoais: usar só para o trabalho pedido.',
      inputSchema: {
        type: 'object',
        properties: {
          site: siteProp(true, ids), dias: daysProp, formulario: { type: 'string', description: 'Só este formulário (nome exato).' },
          estado: { type: 'string', enum: ['novo', 'contactado', 'cliente', 'descartado'] }, procura: { type: 'string', description: 'Texto a procurar no nome, email, empresa ou telefone.' }, limite: limitProp,
        },
        additionalProperties: false,
      },
      run: async (a) => {
        const { siteId } = await siteOrThrow(a.site, true);
        const rows = await listLeads({
          siteId, form: String(a.formulario ?? ''), status: String(a.estado ?? ''), q: String(a.procura ?? '').slice(0, 100), from: periods(clampDays(a.dias)).current.from,
        }, clampLimit(a.limite));
        return rows.map((l) => ({
          id: l.id, quando: iso(l.ts), site: l.site_id, formulario: l.form, nome: l.name, email: l.email, telefone: l.phone, empresa: l.company,
          aceitou_emails: !!l.consent_email, tags: l.tags, estado: statusLabel(l.status), notas: l.notes, canal: l.channel, origem: l.source,
          campanha: l.utm_campaign, pagina: l.page, cidade: l.city, dispositivo: l.device, big_boss: bigBossState(l).label,
        }));
      },
    },
    {
      name: 'ver_clientes',
      title: 'Clientes',
      description: 'As pessoas de cada site (inscritas e compradoras, juntas pelo email), com inscrições, compras, total gasto, produtos, carrinhos por recuperar, origem e última atividade. Segmentos: compradoras, subscritoras (aceitam emails), sem-compra, carrinho, recorrentes. Dados pessoais: usar só para o trabalho pedido.',
      inputSchema: {
        type: 'object',
        properties: {
          site: siteProp(true, ids), segmento: { type: 'string', enum: SEGMENTS.map((s) => s.id).filter(Boolean) },
          procura: { type: 'string' }, ordem: { type: 'string', enum: ['recentes', 'gasto', 'pedidos', 'antigas'] }, limite: limitProp,
        },
        additionalProperties: false,
      },
      run: async (a) => {
        const { siteId } = await siteOrThrow(a.site, true);
        const d = await listCustomers(siteId, { segment: String(a.segmento ?? ''), q: String(a.procura ?? '').slice(0, 100), sort: String(a.ordem ?? 'recentes') });
        return {
          total_pessoas: d.total, por_segmento: d.counts, total_gasto: round(d.revenue, 2), moeda: d.currency,
          pessoas: d.list.slice(0, clampLimit(a.limite)).map((c) => ({
            nome: c.name, email: c.email, telefone: c.phone, empresa: c.company, sites: c.sites, primeira_vez: iso(c.firstTs), ultima_atividade: iso(c.lastTs),
            inscricoes: c.leads, formularios: c.forms, aceita_emails: c.consent, compras: c.purchases, total_gasto: round(c.spent, 2), moeda: c.currency,
            produtos: c.products, carrinhos_por_recuperar: c.openCarts, reembolsos: c.refunds, origem: c.origin, campanha: c.campaign, estado: c.status,
          })),
        };
      },
    },
    {
      name: 'ver_vendas',
      title: 'Vendas Hotmart',
      description: 'Vendas e comportamentos da Hotmart de um site (compras, carrinhos abandonados, pendentes, reembolsos, cancelamentos, acessos ao curso, módulos concluídos): números do período com o anterior, por produto e por origem, e a lista de eventos.',
      inputSchema: {
        type: 'object',
        properties: {
          site: siteProp(false, ids), dias: daysProp,
          tipo: { type: 'string', enum: ['compra', 'carrinho', 'pendente', 'reembolso', 'cancelada', 'garantia', 'acesso', 'modulo', 'assinatura', 'outro'] },
          produto: { type: 'string', description: 'Nome exato do produto.' }, procura: { type: 'string' }, limite: limitProp,
        },
        required: ['site'],
        additionalProperties: false,
      },
      run: async (a) => {
        const { site } = await siteOrThrow(a.site);
        const missing = salesConfigured(site!);
        if (missing) return { erro: missing };
        const syncError = await syncSales(site!);
        const days = clampDays(a.dias);
        const p = periods(days);
        const [stats, events] = await Promise.all([
          salesStats(site!.id, p.current.from, p.previous.from),
          listSales({ siteId: site!.id, kind: String(a.tipo ?? ''), product: String(a.produto ?? ''), q: String(a.procura ?? '').slice(0, 100), from: p.current.from }, clampLimit(a.limite)),
        ]);
        return {
          aviso: syncError,
          atual: stats.current, anterior: { ...stats.previous, byProduct: undefined, byChannel: undefined },
          eventos: events.map((s) => ({
            quando: iso(s.ts), tipo: kindOf(s.kind).label, evento_hotmart: s.event, produto: s.product_name || s.product_id, nome: s.name, email: s.email,
            valor: s.value, moeda: s.currency, pagamento: s.payment_type, prestacoes: s.installments, transacao: s.transaction_id, src: s.src,
            veio_do_site: !!s.session_id, modulo: s.module,
          })),
        };
      },
    },
    {
      name: 'ver_comportamento',
      title: 'Comportamento (Microsoft Clarity)',
      description: 'Números do Microsoft Clarity dos últimos 3 dias por página (sessões, scroll médio, tempo ativo, % de sessões com cliques de raiva, cliques mortos, recuos rápidos, erros de JavaScript). Só com o token do Clarity configurado no hub; guardado em cache (atualiza de 3 em 3 horas).',
      inputSchema: { type: 'object', properties: { site: siteProp(false, ids) }, required: ['site'], additionalProperties: false },
      run: async (a) => {
        const { site } = await siteOrThrow(a.site);
        if (!clarityLink(site!)) return { erro: 'Este site não tem o id do projeto do Clarity (Sites → Editar).' };
        const data = await clarityInsights(site!);
        if (!data) return { erro: 'Falta o token da API do Clarity no Vercel do hub.', painel: clarityLink(site!) };
        return { atualizado: data.fetchedAt ? iso(data.fetchedAt) : null, aviso: data.error, painel: clarityLink(site!), gravacoes: clarityLink(site!, 'recordings'), paginas: data.pages };
      },
    },
  ];
}
