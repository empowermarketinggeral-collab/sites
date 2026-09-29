# Empower — sites e hub central

Monorepo com a app central (hub) e os sites criados pela Empower Marketing.

```
apps/
  hub/            App central: métricas de todos os sites, clientes e domínios (privada, com login)
  empower-site/   Novo site da Empower Marketing (estático, conteúdo editável num ficheiro)
  dreams-academy-site/  Site da Dreams Academy (estático, mesma estrutura do site Empower)
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
Os dados ficam na tua base de dados (Supabase), não em serviços de análise de terceiros.

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

Sem `POSTGRES_URL`, os dados ficam num Postgres local em `data/pglite` (não precisa de instalar nada). `npm run seed:demo -- --clear` apaga os dados de demonstração.

### Publicar no Vercel

1. Vercel → **Add New → Project** → repositório `sites` → **Root Directory:** `apps/hub` → **Deploy**
   (o primeiro deploy pode falhar por faltarem as variáveis; é normal).
2. No projeto: **Storage → Supabase** → liga ao teu projeto Supabase (ou cria um). Isto cria `POSTGRES_URL`.
   As tabelas são criadas sozinhas no primeiro acesso, no schema privado `hub` (com RLS ativo, fora da API pública).
3. **Settings → Environment Variables:** acrescenta `HUB_PASSWORD_HASH` e `HUB_SESSION_SECRET`.
4. **Deployments → Redeploy.** Entra no endereço do hub com a tua password.
5. (Opcional) **Settings → Domains:** `hub.empowermarketing.online`.

No Vercel, país e cidade dos visitantes vêm automaticamente. Alternativa sem Vercel: há um `Dockerfile` (servidor Node; usa `POSTGRES_URL` ou um Postgres local em `/data`).

### Segurança

- Login com password (hash scrypt), cookie de sessão assinado, `HttpOnly`, `SameSite=Strict`, `Secure` (12 h).
- Bloqueio de 15 min após 5 tentativas falhadas (guardado na base de dados).
- Proteção CSRF (verificação de origem nos formulários), CSP, `X-Frame-Options: DENY`, `noindex`.

## Site Empower (`apps/empower-site`)

Site estático (Astro) com o design escuro/roxo das referências. Páginas:

| Página | Endereço | Conteúdo em |
|---|---|---|
| Início | `/` | `src/data/home.json` |
| Mapa de Crescimento | `/mapadecrescimento` | `src/data/mapa.json` |
| Soluções | `/servicos` | `src/data/servicos.json` |
| Casos de Estudo | `/insights` e `/insights/<artigo>` | `src/content/insights/*.md` |

- **Contactos, links (agendamento, WhatsApp, quiz), rodapé e menu:** `src/data/site.json`.
  Nos outros ficheiros, um botão pode apontar para um desses links pelo nome (ex.: `"href": "whatsappMapa"`).
- **Dúvidas frequentes** (usadas no Mapa e nas Soluções): `src/data/faq.json`.
- **Novo caso de estudo:** cria um ficheiro `.md` em `src/content/insights/` (copia um existente e muda o texto e o cabeçalho). O nome do ficheiro é o endereço.
- **Imagens:** `public/images/hero.jpg` (fundo do topo) e `public/images/og.jpg` (imagem quando o link é partilhado). Substitui por fotos reais quando as tiveres.
- **Páginas legais** (Privacidade, Cookies, Termos): `src/content/legal/*.md`.
- **Página privada `/reuniao-agendada`** (depois de marcar reunião): `src/data/reuniao.json`. Não aparece no menu nem no Google.
  Conta como conversão `agendamento` (app central, Google Ads, Meta `Schedule`), uma vez por sessão.
  Vídeos: em `videos.items`, `type` = `file` (ficheiro em `public/videos/…`), `youtube` (ID do vídeo) ou `vimeo` (ID); a secção só aparece com vídeos.
- **SEO:** títulos e descrições em `meta` de cada ficheiro de `src/data/`; dados da empresa e palavras-chave em `site.json → seo`
  (usados nos dados estruturados do Google e no `llms.txt`). O `sitemap-index.xml` e o `llms.txt` são gerados no build;
  `/sitemap.xml` redireciona para o sitemap. Páginas privadas ficam fora do sitemap (`PRIVATE` em `astro.config.mjs`).
- **Redirecionamentos** de endereços antigos (artigos `/post/...`, `/portefolio`) e **cabeçalhos de segurança**: `vercel.json`.
- **Google Analytics, Google Ads e Meta Pixel:** preenche em `src/data/site.json` → `tracking`:
  - `googleAnalyticsId` — ex.: `G-XXXXXXX` (GA4 → Administrador → Fluxos de dados)
  - `googleAdsId` — ex.: `AW-123456789` (Google Ads → Ferramentas → Conversões → Etiqueta)
  - `googleAdsLeadLabel` — o rótulo da conversão de lead (a parte depois de `AW-123456789/`)
  - `metaPixelId` — o número do Pixel (Gestor de Eventos da Meta)

  Com pelo menos um ID preenchido, aparece o banner de cookies. Nada do Google/Meta carrega antes de a pessoa aceitar
  (Consent Mode v2 do Google incluído). Cliques em botões com `data-track="lead"`, `agendamento` ou `contacto`
  contam como conversão no Google Ads e como `Lead`/`Schedule`/`Contact` na Meta.
- **Ligar ao hub:** em `site.json`, `analytics.hubUrl` = endereço do hub; regista o site no hub com o mesmo `siteId`
  e acrescenta esse domínio a `script-src` e `connect-src` no `Content-Security-Policy` do `vercel.json`.

```bash
cd apps/empower-site
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
```

### Publicar no Vercel

1. Vercel → **Add New → Project** → importa o repositório `sites` do GitHub.
2. Em **Root Directory** escolhe `apps/empower-site` (o Vercel deteta o Astro sozinho) → **Deploy**.
3. Confirma o site no endereço `*.vercel.app` que o Vercel te dá.
4. **Settings → Domains** → adiciona `empowermarketing.online` e `www.empowermarketing.online`, e muda o DNS
   no teu fornecedor de domínio para os valores que o Vercel indicar.

Cada alteração enviada para o branch principal publica o site automaticamente; outros branches geram uma pré-visualização.

## Site Dreams Academy (`apps/dreams-academy-site`)

Site estático (Astro) com a identidade da Dreams Academy: azul-marinho, dourado e cinza, espelho dourado, Playfair Display + Montserrat.
Os endereços são os mesmos do site atual (`dreamsacademy.pt/...`), para os links já partilhados continuarem a funcionar.

| Página | Endereço | Conteúdo em |
|---|---|---|
| Início | `/` | `src/data/home.json` |
| Técnica Profissional | `/tecnicadecabelos` | `src/data/tecnica.json` |
| Marketing & Negócio | `/tmarketingenegocios` | `src/data/negocio.json` |
| Programa Dreams Academy | `/programa_dreams_academy` | `src/data/programa.json` |
| Guia Anti-Erros | `/ebook-guia-anti-erros` | `src/content/produtos/ebook-guia-anti-erros.json` |
| Ondas que Fidelizam | `/ondas-que-fidelizam` | `src/content/produtos/ondas-que-fidelizam.json` |
| Invisível → Inesquecível | `/invisivelaoinesquecivel` | `src/content/produtos/invisivelaoinesquecivel.json` |
| Do Click ao Compromisso | `/clickaocompromisso` | `src/content/produtos/clickaocompromisso.json` |
| Fluxo Estratégico | `/fluxoestretategico` | `src/content/produtos/fluxoestretategico.json` |
| Termos, Privacidade, Reembolso | `/termos_condicoes`, `/politica_de_privacidade`, `/politica_de_reembolso` | `src/content/legal/*.md` |

- **Novo produto:** copia um ficheiro de `src/content/produtos/` e muda o texto; o nome do ficheiro é o endereço.
  As secções `problem`, `solution`, `modules`, `bonuses`, `testimonials` e `faq` são opcionais (se não existirem, não aparecem).
  A formadora (`trainer`: `patricia` ou `beatriz`) vem de `src/data/site.json` → `trainers`.
- **Links** (candidatura, checklist, Instagram, e-mail, newsletter, "quero ser avisada"), menu e rodapé: `src/data/site.json`.
- **E-mail de contacto:** `dreams.beautyandbusiness@gmail.com` (em `src/data/site.json` → `company` e `links`).
- **Fotos das formadoras:** `public/images/patricia-melo.jpg` e `beatriz-melo.jpg` (600×800), ligadas em `site.json` → `trainers` → `photo`.
- **Imagens:** `public/images/espelho.webp|png` (espelho do manual de marca), `public/images/tecido.webp` (tecido de fundo),
  `public/images/og.jpg` (imagem quando o link é partilhado), `public/favicon.png`.
- **App central:** o site envia visitas para o hub com o id `dreams-academy`. No hub → **Sites**, adiciona um site com o nome
  **Dreams Academy** (o id fica `dreams-academy`) e o domínio `dreamsacademy.pt`. Conversões medidas:
  - `compra` — clique num botão que leva ao checkout da Hotmart
  - `lead` — candidatura ao Programa, checklist gratuita, newsletter, "quero ser avisada"
  - `contacto` — "Enviar e-mail"; `instagram` — clique no Instagram (evento, não conta como conversão)
- **SEO:** título e descrição de cada página no campo `meta` do ficheiro de conteúdo (até ~60 e ~155 caracteres).
  Palavras-chave do negócio em `site.json` → `meta.keywords`. Todas as páginas têm dados estruturados para o Google
  (organização; nas páginas de venda e no Programa também "Curso" e "Perguntas frequentes").
- **`/sitemap.xml` e `/llms.txt`** (resumo do site para assistentes de IA) são gerados sozinhos a partir do conteúdo; `public/robots.txt` aponta para o sitemap.
  Depois de publicar, submete `https://dreamsacademy.pt/sitemap.xml` no Google Search Console.
- **Google Analytics / Google Ads / Meta Pixel:** vazios por agora; preenche `tracking` em `site.json` (igual ao site Empower) e o banner de cookies aparece sozinho.

```bash
cd apps/dreams-academy-site
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
```

**Publicar no Vercel:** novo projeto com **Root Directory** `apps/dreams-academy-site`, depois **Settings → Domains** → `dreamsacademy.pt` e `www.dreamsacademy.pt`.
