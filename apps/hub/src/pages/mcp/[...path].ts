import type { APIRoute } from 'astro';
import { agentAuthorized, agentTools } from '../../lib/agent';
import { clientIp, rateLimiter } from '../../lib/sites';

// Conector MCP (Streamable HTTP, sem sessão) para os agentes do Claude, só leitura.
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
          instructions: 'Back-office dos sites da Empower (só leitura): visitas, páginas, conversões, origens, leads, clientes, vendas Hotmart e Clarity. Começa por ver_sites para saber os ids. Datas em ISO (UTC); percentagens já em %. Leads e clientes têm dados pessoais: usa-os só para o trabalho pedido.',
        },
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list': {
      const tools = await agentTools();
      return { jsonrpc: '2.0', id, result: { tools: tools.map(({ run, ...t }) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: false } })) } };
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
  if (!agentAuthorized(String(params.path ?? '').replace(/\/+$/, '') || bearer)) return json({ error: 'unauthorized' }, 401);

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

// Sem fluxo SSE nem sessões: só POST.
const notAllowed: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
export const GET = notAllowed;
export const DELETE = notAllowed;
