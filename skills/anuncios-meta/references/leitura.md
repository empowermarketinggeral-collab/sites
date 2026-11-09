# Ler resultados e decidir

## Ritmo

- **Dia 1 a 3:** só verificar que entrega, que o evento dispara e que não há recusas. Não mexer.
- **Dia 7:** primeira leitura. Cortar anúncios claramente maus (regras abaixo). Não mexer na estrutura.
- **Dia 14:** decisão: manter, ajustar oferta ou página, escalar.
- **Mensal:** relatório com o resultado de negócio (marcações, vendas), não só métricas de anúncio. Juntar o histórico em `benchmarks-pt.md`.

Dados: Metricool (`getAnalyticsDataByMetrics`, rede `facebookAds`, conectores `campaigns` e `ads`) para métricas Meta; hub para sessões, leads e vendas por `utm_campaign`; Big Boss para o estado dos leads (contactado, cliente).

## Diagnóstico por sintoma

| Sintoma | Provável causa | O que fazer |
|---|---|---|
| CPM muito acima do intervalo | Público pequeno, criativo com baixa qualidade, época cara (novembro e dezembro) | Alargar zona ou público, novos criativos |
| CTR (link) abaixo de ~0,8% | Gancho fraco, criativo não fala com ninguém | Novo gancho e novos ângulos |
| CTR bom, poucos leads | Página lenta, oferta pouco clara, formulário longo, desalinhamento anúncio/página | Rever página e oferta, testar formulário instantâneo |
| Muitos leads, poucas marcações | Leads pouco qualificados ou resposta lenta | Pergunta de qualificação, formulário de maior intenção, responder em menos de 1 hora |
| Custo por resultado sobe após semanas boas | Fadiga criativa (frequência alta) | Rodar ângulos novos |

## Regras de corte (por anúncio, depois de 7 dias)

- Gastou 2 a 3 vezes o custo por resultado alvo sem nenhum resultado → desligar.
- CTR (link) menos de metade da média da campanha com mais de ~1.000 impressões → desligar.
- Melhor anúncio: criar 2 variações do mesmo ângulo e 1 ângulo novo inspirado nele.

## Regras de escala

- Custo por resultado abaixo da meta durante 7 dias e com volume → subir orçamento 20%.
- Repetir a cada 3 a 4 dias enquanto se mantém. Se piorar mais de 20%, voltar ao nível anterior.
