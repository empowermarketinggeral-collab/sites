# Empower — sites e hub central

Monorepo com a app central (hub) e os sites criados pela Empower Marketing.

```
apps/
  hub/            App central: métricas de todos os sites, clientes e domínios (privada, com login)
  empower-site/   Novo site da Empower Marketing (estático, conteúdo editável num ficheiro)
```

## Hub (`apps/hub`)

Painel privado, no estilo das Análises da Shopify:

- **Início** — sessões e conversões de todos os sites, estado (online/offline) de cada site, alertas de domínios a expirar.
- **Análises** — por site ou todos juntos, 7/30/90 dias, sempre comparado com o período anterior:
  sessões ao longo do tempo, dispositivo, local (país · cidade), referenciador (canal · origem), redes sociais, canal, página de destino e funil de conversão.
- **Sites** — registo de cada site e o código de tracking para colar no `<head>`.
- **Clientes** e **Domínios** — contactos, notas, datas de expiração, ligação a cada site.

### Como funciona o tracking

Cada site carrega um script leve (`/t.js`) do hub. **Não usa cookies**: o visitante é identificado por um hash diário (IP + browser + site) que muda todos os dias, por isso não é preciso banner de cookies para estas métricas.
Os dados ficam no teu servidor (SQLite), não em serviços de terceiros.

- Conversões: acrescenta `data-track="lead"` (ou `contacto`, `agendamento`, `compra`) a um botão ou link.
- Outros eventos: `data-track="nome_do_evento"` ou `window.empowerTrack('nome_do_evento')`.
- País/cidade vêm dos cabeçalhos do CDN/proxy (Cloudflare `cf-ipcountry`/`cf-ipcity`, Vercel, ou `x-country`/`x-city`). Sem CDN aparecem como "Desconhecido".
- O hub só aceita eventos vindos do domínio registado para o site, ignora bots e limita pedidos por IP.

### Correr localmente

```bash
cd apps/hub
npm install
cp .env.example .env
npm run hash-password -- "uma-password-forte"   # copia o resultado para HUB_PASSWORD_HASH no .env
openssl rand -hex 32                            # copia para HUB_SESSION_SECRET no .env
npm run seed:demo                               # opcional: cria o "Site Demo" com dados fictícios
npm run dev                                     # http://localhost:4321
```

`npm run seed:demo -- --clear` apaga os dados de demonstração.

### Publicar

Precisa de um servidor Node 22.13+ com **disco persistente** (a base de dados é o ficheiro `HUB_DB_FILE`):
Railway, Fly.io, Render (com disco) ou um VPS. Há um `Dockerfile` pronto — monta um volume em `/data`.

Variáveis obrigatórias: `HUB_PASSWORD_HASH`, `HUB_SESSION_SECRET`. Usa sempre HTTPS.
Faz backup regular do ficheiro `hub.db`.

### Segurança

- Login com password (hash scrypt), cookie de sessão assinado, `HttpOnly`, `SameSite=Strict`, `Secure` (12 h).
- Bloqueio de 15 min após 5 tentativas falhadas.
- Proteção CSRF (verificação de origem nos formulários), CSP, `X-Frame-Options: DENY`, `noindex`.

## Site Empower (`apps/empower-site`)

Site estático (Astro) com o design escuro/roxo das referências.

- **Todo o texto está em `src/content/site.json`** — títulos, secções, soluções, casos de estudo, contactos. Edita esse ficheiro e publica.
- Imagem do hero: coloca `public/images/hero.jpg` (sem ela fica um fundo aveludado em CSS).
- Contactos: preenche `contact.email`, `contact.bookingUrl` (ex.: Calendly), `instagram`, `linkedin`.
- Casos de estudo: acrescenta itens em `cases.items` com `client`, `sector`, `summary`, `result`, `image`.
- Ligar ao hub: em `analytics.hubUrl` põe o endereço do hub (ex.: `https://hub.empowermarketing.online`) e regista o site no hub com o mesmo `siteId`.
  Acrescenta também esse domínio a `script-src` e `connect-src` em `public/_headers`.

```bash
cd apps/empower-site
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/ para Cloudflare Pages, Netlify ou similar
```

`public/_headers` define os cabeçalhos de segurança (CSP, HSTS, etc.) para Cloudflare Pages/Netlify.
