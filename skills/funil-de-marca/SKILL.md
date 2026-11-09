---
name: "funil-de-marca"
description: "Desenhar um funil de aquisição completo para uma marca da Empower (ou cliente) a partir de um objetivo de negócio: briefing, diagnóstico com dados reais (Metricool, hub, Big Boss), funil invertido com orçamento real, campanhas Meta e Google, criativos, página de destino, tracking, metas e regras de revisão, validado em painel e entregue num dashboard pronto a implementar. Usar quando a Beatriz pede um funil, uma campanha nova para uma marca, um plano de anúncios ou 'quero X clientes/marcações/vendas'."
---

# Funil de Marca · Empower Marketing

O funil liga um objetivo de negócio a campanhas concretas, com o orçamento contado ao euro e o tracking definido antes de gastar. Usa as skills **anuncios-meta** e **anuncios-google** para a parte de cada plataforma (ler os `SKILL.md` delas e as referências que o passo pedir) e, quando existe, o **Mapa de Crescimento** da marca (posição, Cliente ao Cubo, o que trava).

## Regras de trabalho (da Beatriz)

1. **Uma coisa de cada vez.** Briefing → diagnóstico → desenho → validação → entrega. Nada passa à fase seguinte sem consenso.
2. **Visual antes de texto.** Cada fase num painel visual inline; respostas curtas no chat (a Beatriz trabalha no telemóvel).
3. **Validação no painel:** cada peça (etapa, campanha, ângulo, meta) com Entra / Ajustar / Fora e um botão que envia as decisões para o chat com "Comentários:" no fim. O botão só envia quando tudo está decidido.
4. **Orçamento real.** Contas à vista, euros por dia e por mês, três cenários (pessimista, provável, otimista). Pressupostos assinalados como pressupostos.
5. **Honestidade:** cada número com fonte e confiança. Histórico da conta > histórico Empower > benchmarks públicos > pressupostos.
6. **Frescura:** antes de desenhar, ver a data de verificação das skills anuncios-meta e anuncios-google. Mais de 45 dias, avisar.
7. Português de Portugal, tratar por tu, sem travessões nem exclamações nos textos que vão para o dashboard.

## Fase 1 · Briefing (perguntas de escolha múltipla, uma ronda)

Ver `references/briefing.md`. Ler primeiro o que já existe (registo de marcas em `references/marcas.md`, skills de stories e relatórios da marca, Mapa de Crescimento, projeto da marca) e só perguntar o que falta. Mínimo: objetivo em número e prazo, oferta de entrada, orçamento mensal máximo, zona, destino (site, WhatsApp, formulário), quem responde aos leads e em quanto tempo.

## Fase 2 · Diagnóstico (dados reais)

Em paralelo:
- **Metricool:** `getBrandSettings` (contas ligadas: `facebookAdsData`, `googleAdsData`, `gbpData`, redes); `getAnalyticsDataByMetrics` para anúncios (últimos 90 dias), Instagram (alcance, seguidores, melhores publicações) e Perfil da Empresa (pesquisas, chamadas, direções).
- **Hub:** sessões, canais, conversões e leads do site da marca (se a marca tem site registado). Perguntar se não houver acesso nesta sessão.
- **Procura no Google:** lista de palavras com intenção (skill anuncios-google) e volumes, se disponíveis.
- **Concorrência:** Biblioteca de Anúncios da Meta e pesquisas Google pelos concorrentes conhecidos (o que anunciam, há quanto tempo, que oferta).

Painel do diagnóstico: contas e tracking (verde, amarelo, vermelho), procura, ponto de partida (números atuais), o que os concorrentes anunciam, bloqueios antes de lançar.

## Fase 3 · Desenho do funil

1. **Funil invertido** (`references/funil-invertido.md`): do objetivo para trás até ao orçamento, por plataforma, em três cenários. Verificar o teto de procura do Google.
2. **Etapas** (descoberta, consideração, conversão, reativação): para cada uma, a pessoa do Cliente ao Cubo, o nível de consciência, a mensagem, o canal, o formato, o indicador.
3. **Campanhas:** tabela por plataforma com nome no padrão, objetivo, evento, orçamento diário, zona, público, destino. Seguir as estruturas padrão das skills de anúncios.
4. **Criativos:** 3 a 5 ângulos com ganchos e guiões (anuncios-meta `criativos.md`), anúncios de pesquisa (anuncios-google `palavras-e-anuncios.md`), nota de risco de política.
5. **Página de destino e resposta:** o que a página tem de ter (promessa igual à do anúncio, prova, marcação em 2 cliques, `data-track`), e o guião de resposta ao lead (tempo máximo, mensagem de WhatsApp).
6. **Orgânico de apoio:** o que publicar no feed e nas stories durante a campanha (ligar às skills de stories e conteúdo mensal da marca). Pode ser agendado pelo Metricool.
7. **Tracking:** eventos, UTMs, ligação ao hub e ao Big Boss, checklist das duas skills.
8. **Metas e revisão:** indicadores por etapa, metas por cenário, dias de revisão (3, 7, 14, 21, 30) e regras de corte e escala.

Cada ponto validado no painel antes do seguinte (podem ir 2 a 3 pontos por painel para não arrastar).

## Fase 4 · Entrega

- **Dashboard** a partir do tipo de artefacto Dashboard, título "Funil · <Marca> · <Oferta>", lang pt-PT. Separadores: 1 Resumo (objetivo, orçamento, cenários, linha de tempo) · 2 Funil (etapas e funil invertido) · 3 Campanhas (Meta, Google) · 4 Criativos · 5 Implementação (checklist por pessoa e data) · 6 Resultados (vazio no início; atualiza-se nas revisões com dados do Metricool e do hub, previsto vs real). Datasets em JSON fixos, como no Mapa de Crescimento. O mesmo dashboard serve todas as marcas: só os datasets mudam. É este dashboard que vai para o Big Boss.
- **Documento** no projeto da marca: `claude/funis/<marca>/<aaaamm>-<oferta>.md` com tudo o que foi validado, pressupostos e pontos em aberto.
- **Ficheiros de montagem:** textos prontos a copiar e, quando útil, CSV para o Google Ads Editor e folha de importação em massa da Meta.

## Fase 5 · Revisões

Nos dias marcados: ler resultados (Metricool, hub, Big Boss), atualizar o separador Resultados (previsto vs real), aplicar as regras de `leitura.md` de cada skill, propor as alterações num painel (Entra / Fora) e registar no documento. No fim do funil, passar os números reais para o "Histórico Empower" dos `benchmarks-pt.md` das duas skills: é assim que os próximos funis ficam mais certos.
