---
name: "anuncios-google"
description: "Planear, estruturar, escrever e rever campanhas Google Ads para as marcas da Empower: Pesquisa (com AI Max), Performance Max (incluindo objetivos de loja para negócio local), Demand Gen e YouTube, palavras-chave, anúncios, Perfil da Empresa, conversões, Consent Mode v2, orçamento e leitura de resultados. Usar sempre que se fala de Google Ads, anúncios no Google, pesquisa paga, YouTube Ads, ou quando o funil-de-marca pede a parte Google de um funil."
---

# Anúncios Google · Empower Marketing

**Última verificação das referências: 2026-11-08.** Se passaram mais de 45 dias, dizer à Beatriz no início e propor seguir `references/atualizar.md` antes de desenhar.

## Regras de trabalho

1. **Intenção primeiro.** O Google apanha quem já procura. Antes de escolher campanha, perceber quanta procura existe (volumes no Planeador de Palavras-chave, Perfil da Empresa, pesquisas da marca). Sem procura, o Google não cria procura: aí entra a Meta, Demand Gen ou YouTube.
2. **Orçamento real** com o funil invertido feito à vista, em euros por dia e por mês. Cada custo de referência com fonte e confiança. Nunca inventar números.
3. **Conversões antes de gastar.** Nenhuma campanha com estratégia de licitação automática é lançada sem conversões principais a funcionar e com Consent Mode v2 (obrigatório para tráfego do EEE). Ver `references/tracking.md`.
4. **Controlar a automação.** AI Max, Performance Max e licitação inteligente ficam ligados quando ajudam, mas com exclusões de marca, palavras-chave negativas, exclusões de URL e revisão semanal dos termos de pesquisa.
5. Português de Portugal, tratar por tu.

## Ficheiros de referência

| Ficheiro | Quando ler |
|---|---|
| `references/estrutura.md` | Escolher tipo de campanha, estrutura, licitação, AI Max, PMax, negócio local |
| `references/palavras-e-anuncios.md` | Pesquisa de palavras-chave, correspondências, negativas, anúncios RSA, recursos |
| `references/tracking.md` | Conversões, Consent Mode v2, conversões otimizadas, Perfil da Empresa, UTMs, hub e Big Boss |
| `references/politicas.md` | Regras do Google para saúde, estética, alegações e marcas |
| `references/benchmarks-pt.md` | CPC, CTR, taxas de conversão de referência e regras de orçamento |
| `references/leitura.md` | Ler resultados, termos de pesquisa, cortar e escalar |
| `references/atualizar.md` | Procedimento de atualização |
| `references/changelog.md` | O que mudou no Google e nesta skill |

## Fluxo quando pedem uma campanha Google

1. **Briefing** (se o funil-de-marca ainda não o fez): marca, oferta, objetivo e número, prazo, orçamento, zona, página de destino, Perfil da Empresa, conta Google Ads.
2. **Verificar a conta** com o Metricool: `getBrandSettings` mostra `googleAdsData` (ID de cliente) e `gbpData` (Perfil da Empresa).
3. **Histórico** (se houver): `getAnalyticsDataByMetrics`, rede `googleAds`, conectores `campaigns`, `keyworks` (sic, é este o nome) e `evolution`, últimos 90 dias. Ver gasto, CPC, CTR, conversões, custo por conversão, palavras que convertem e as que só gastam.
4. **Procura:** lista de palavras por intenção (ver `palavras-e-anuncios.md`) com volumes e CPC estimados do Planeador de Palavras-chave. Se a Beatriz não tiver acesso ao Planeador nesta sessão, dar a lista e pedir que exporte os volumes, ou trabalhar com intervalos assinalados.
5. **Desenho** (seguir `estrutura.md`): tipo de campanha, grupos de anúncios, licitação, orçamento por linha, zona, horários.
6. **Anúncios e recursos:** 2 anúncios RSA por grupo (15 títulos, 4 descrições), extensões (recursos de local, chamada, sitelinks, frases de destaque, imagens).
7. **Tracking** e **política**.
8. **Entregar** em tabela pronta a montar e, quando forem várias campanhas, uma folha CSV para o Google Ads Editor. Incluir checklist de lançamento e regras de revisão.

## Padrão de nomes (igual ao da Meta, liga Google, hub e Big Boss)

- Campanha: `<marca>_<etapa>_<tipo>_<oferta>_<aaaamm>` ex.: `studio_conv_search_consulta_202611`
- Grupo de anúncios: `<tema>` ex.: `cabeleireiro_zona`, `coloracao`, `marca`
- UTMs no modelo de acompanhamento da conta: `{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={_campanha}&utm_term={keyword}&utm_content={creative}` com o parâmetro personalizado `{_campanha}` definido em cada campanha (ou usar a marcação automática gclid, que o Google Analytics lê; o hub lê UTMs).

Tipos: `search`, `pmax`, `pmaxloja`, `demandgen`, `youtube`.

## O que o Claude consegue fazer com as ferramentas atuais

- **Ler** resultados Google Ads pelo Metricool (campanhas, palavras-chave, evolução) e métricas do Perfil da Empresa.
- **Preparar tudo**: estrutura, palavras-chave, negativas, anúncios, recursos, folha para o Google Ads Editor, guiões de vídeo.
- **Não consegue** criar nem editar campanhas diretamente na conta com as ferramentas desta sessão. A montagem final é tua.
