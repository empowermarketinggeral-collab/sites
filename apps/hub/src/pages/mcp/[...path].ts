import type { APIRoute } from 'astro';
import { agentAuthorized, agentTokenState, agentTools, type AgentTokenState } from '../../lib/agent';
import { clientIp, rateLimiter } from '../../lib/sites';

// Conector MCP (Streamable HTTP, sem sessão) para os agentes do Claude (leitura; atualizar_lead escreve).
//   https://<hub>/mcp/<HUB_AGENT_TOKEN>        (conectores personalizados do Claude)
//   https://<hub>/mcp  + Authorization: Bearer <HUB_AGENT_TOKEN>   (Claude Code, etc.)

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const limited = rateLimiter(120); // pedidos por minuto por IP

interface RpcMessage { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const rpcError = (id: RpcMessage['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function handle(msg: RpcMessage): Promise<unknown | null> {
  if (msg.id === undefined || msg.id === null) return null; // notificação (ex.: notifications/initialized): sem resposta
  const { id, method, params = {} } = msg;
  switch (method) {
    case 'initialize': {
      const asked = String(params.protocolVersion ?? '');
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'empower-hub', title: 'Empower Hub', version: '1.0.0' },
          instructions: 'Back-office dos sites da Empower: visitas, páginas, conversões, origens, leads, clientes, vendas Hotmart e Clarity (leitura), e atualizar_lead para marcar o estado e as notas de um lead. Começa por ver_sites para saber os ids. Datas em ISO (UTC); percentagens já em %. Leads e clientes têm dados pessoais: usa-os só para o trabalho pedido.',
        },
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list': {
      const tools = await agentTools();
      return { jsonrpc: '2.0', id, result: { tools: tools.map(({ run, writes, ...t }) => ({ ...t, annotations: writes ? { readOnlyHint: false, destructiveHint: false, openWorldHint: false } : { readOnlyHint: true, openWorldHint: false } })) } };
    }
    case 'tools/call': {
      const tool = (await agentTools()).find((t) => t.name === params.name);
      if (!tool) return rpcError(id, -32602, `Ferramenta desconhecida: ${String(params.name)}`);
      try {
        const data = await tool.run((params.arguments ?? {}) as Record<string, unknown>);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data) }] } };
      } catch (e) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: (e as Error).message }], isError: true } };
      }
    }
    default:
      return rpcError(id, -32601, `Método não suportado: ${String(method)}`);
  }
}

export const POST: APIRoute = async ({ request, params, clientAddress }) => {
  if (limited(clientIp(request.headers, clientAddress))) return json({ error: 'too_many' }, 429);
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim() ?? '';
  if (!(await agentAuthorized(String(params.path ?? '').replace(/\/+$/, '') || bearer))) return json({ error: 'unauthorized' }, 401);

  const text = await request.text();
  if (text.length > 100_000) return json(rpcError(null, -32600, 'Pedido demasiado grande'), 413);
  let body: RpcMessage | RpcMessage[];
  try {
    body = JSON.parse(text);
  } catch {
    return json(rpcError(null, -32700, 'JSON inválido'), 400);
  }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.slice(0, 20).map(handle))).filter((r) => r !== null);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  if (!body || typeof body !== 'object') return json(rpcError(null, -32600, 'Pedido inválido'), 400);
  const out = await handle(body);
  return out === null ? new Response(null, { status: 202 }) : json(out);
};

// Aberto no browser: página que diz se o endereço e a chave estão certos (sem mostrar a chave).
const STATE_TEXT: Record<AgentTokenState, [boolean, string]> = {
  certa: [true, 'A chave está certa. Este é o endereço do conector: copia-o da barra do browser e cola-o no Claude (Definições → Conectores → Adicionar conector personalizado).'],
  errada: [false, 'Este endereço não tem a chave certa. Copia o endereço do conector na página Agentes do hub.'],
  sem_chave: [false, 'Falta a chave no fim do endereço. Copia o endereço completo do conector na página Agentes do hub.'],
  sem_variavel: [false, 'Ainda não há endereço para os agentes. Entra no hub, abre a página Agentes e carrega em "Criar endereço do conector".'],
  variavel_curta: [false, 'A HUB_AGENT_TOKEN do Vercel tem menos de 24 caracteres. Usa uma chave mais longa e faz Redeploy.'],
};

function statusPage(state: AgentTokenState): Response {
  const [ok, text] = STATE_TEXT[state];
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Conector · Empower Hub</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F5F1EA;color:#121212;font:500 16px/1.55 system-ui,sans-serif;padding:16px}main{max-width:560px;background:#fff;border:1px solid #E6E0D5;border-radius:3px;padding:2rem}h1{font:700 1.4rem Georgia,serif;margin:0 0 1rem}.s{font-weight:700;color:${ok ? '#1F7A4D' : '#B3261E'}}</style></head>
<body><main><h1>Conector do Empower Hub</h1><p class="s">${ok ? '✓' : '✗'} ${text}</p><p>Se o Claude disser "não foi possível registar um serviço de login", é porque o hub recusou a chave: corrige o que esta página indicar e volta a ligar o conector.</p></main></body></html>`;
  return new Response(html, { status: ok ? 200 : 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Para os clientes MCP: sem fluxo SSE nem sessões, só POST.
export const GET: APIRoute = async ({ request, params, clientAddress }) => {
  if (!(request.headers.get('accept') ?? '').includes('text/html')) return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (limited(clientIp(request.headers, clientAddress))) return json({ error: 'too_many' }, 429);
  return statusPage(await agentTokenState(String(params.path ?? '').replace(/\/+$/, '')));
};
export const DELETE: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
