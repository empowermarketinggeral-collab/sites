---
name: "anuncios-meta"
description: "Planear, estruturar, escrever e rever campanhas de anúncios na Meta (Facebook, Instagram, WhatsApp) para as marcas da Empower: objetivo, estrutura de campanha, públicos, criativos, Pixel e CAPI, políticas, orçamento e leitura de resultados. Usar sempre que se fala de anúncios Meta, Instagram Ads, Facebook Ads, Gestor de Anúncios, ou quando o funil-de-marca pede a parte Meta de um funil."
---

# Anúncios Meta · Empower Marketing

**Última verificação das referências: 2026-11-08.** Se passaram mais de 45 dias, dizer à Beatriz no início ("as referências Meta têm X dias, queres que verifique novidades antes?") e, se ela aceitar, seguir `references/atualizar.md` antes de desenhar.

## Regras de trabalho

1. **Objetivo de negócio primeiro, objetivo de campanha depois.** Partir sempre de um número real (marcações, candidaturas, vendas) e só então escolher o objetivo de campanha que otimiza para esse evento.
2. **Orçamento real.** Todos os valores em euros por dia e por mês, com as contas feitas à vista (funil invertido: meta, taxa, custo). Cada custo de referência leva a fonte e a confiança. Nunca inventar benchmarks: quando não há dado de Portugal, dizer e usar intervalo.
3. **Criativo é a segmentação.** Com o sistema de entrega atual da Meta (Andromeda + Advantage+), o que decide quem vê o anúncio é sobretudo o criativo. Investir mais tempo nos ângulos e nos criativos do que nos públicos.
4. **Medir antes de gastar.** Nenhuma campanha é lançada sem o evento de conversão confirmado (Pixel + CAPI ou formulário instantâneo + CRM). Ver `references/tracking.md`.
5. **Política antes de publicar.** Rever cada texto e criativo com `references/politicas.md`. Beleza, estética e saúde têm regras próprias.
6. Português de Portugal, tratar por tu, sem jargão sem explicação quando o texto for para quem não é de marketing.

## Ficheiros de referência (ler conforme a necessidade)

| Ficheiro | Quando ler |
|---|---|
| `references/estrutura.md` | Escolher objetivo, estrutura de campanha, conjuntos, Advantage+, fase de aprendizagem, escalar |
| `references/criativos.md` | Ângulos, ganchos, formatos, quantidade e diversidade de criativos, textos |
| `references/tracking.md` | Pixel, Conversions API, eventos, formulários instantâneos, WhatsApp, UTMs, ligação ao hub e ao Big Boss |
| `references/politicas.md` | Regras de anúncios em beleza, estética, saúde, atributos pessoais, antes e depois, UE |
| `references/benchmarks-pt.md` | Custos de referência (CPM, CPC, CTR, custo por lead) em Portugal e regras de orçamento |
| `references/leitura.md` | Ler resultados, quando cortar, quando escalar, ritmo de revisão |
| `references/atualizar.md` | Procedimento para manter estas referências atualizadas |
| `references/changelog.md` | O que mudou na Meta e nesta skill, por data |

## Fluxo quando pedem uma campanha Meta

1. **Briefing curto** (se o funil-de-marca ainda não o fez): marca, oferta, objetivo e número, prazo, orçamento disponível, zona geográfica, página de destino ou canal de conversa, ativos existentes (fotos, vídeos, provas), conta de anúncios ligada.
2. **Verificar a conta.** Com o Metricool: `getBrandSettings` mostra se a marca tem `facebookAdsData` (conta `act_...`). Sem conta ligada, avisar: o plano faz-se, mas os números de histórico não existem e o lançamento depende de ligar a conta.
3. **Histórico.** Se há conta, ler os últimos 90 dias com `getAnalyticsDataByMetrics` (rede `facebookAds`/`metaAds`, conectores `campaigns` e `ads`): gasto, CPM, CPC, CTR, custo por resultado, por campanha e por anúncio. O histórico da própria conta pesa mais do que qualquer benchmark.
4. **Desenho** (seguir `estrutura.md`): objetivo, evento de otimização, número de campanhas e conjuntos, orçamento por linha, públicos, posicionamentos, calendário.
5. **Criativos** (seguir `criativos.md`): 3 a 5 ângulos diferentes, 2 a 3 criativos por ângulo, textos prontos (texto principal, título, descrição, chamada para ação), guião de vídeo quando for vídeo.
6. **Tracking** (seguir `tracking.md`): eventos, UTMs, nomes de campanha no padrão Empower.
7. **Política** (seguir `politicas.md`): marcar riscos em cada criativo.
8. **Entregar** em tabela pronta a montar no Gestor de Anúncios, com a checklist de lançamento e as regras de revisão (`leitura.md`).

## Padrão de nomes (obrigatório, liga Meta, hub e Big Boss)

- Campanha: `<marca>_<etapa>_<objetivo>_<oferta>_<aaaamm>` ex.: `studio_conv_leads_consulta_202611`
- Conjunto: `<publico>_<zona>_<posicionamento>` ex.: `adv+_lisboa15km_auto`
- Anúncio: `<angulo>_<formato>_<versao>` ex.: `escuta_reel_v1`
- UTMs: `utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}`

Etapas: `desc` (descoberta), `cons` (consideração), `conv` (conversão), `ret` (reativação ou remarketing).

## O que o Claude consegue fazer com as ferramentas atuais

- **Ler** resultados de anúncios Meta e Google pelo Metricool (campanhas, anúncios, gasto, cliques, conversões).
- **Agendar** publicações orgânicas pelo Metricool (para aquecer o perfil antes e durante a campanha).
- **Preparar tudo** para montar: estrutura, textos, guiões, briefing de design, nomes, UTMs, folha para importação em massa.
- **Não consegue** criar nem editar campanhas diretamente na Meta com as ferramentas desta conta. A montagem final no Gestor de Anúncios é tua (ou por um conector de anúncios, se for ligado mais tarde; nesse caso atualizar esta secção).
