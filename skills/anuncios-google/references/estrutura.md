# Estrutura de campanhas Google Ads

Verificado em 2026-11-08. Fontes no fim.

## Como o Google funciona agora (o essencial)

- **AI Max para Pesquisa** saiu de beta e é o caminho atual para campanhas de Pesquisa. Junta três peças que se ligam em separado: correspondência alargada de termos de pesquisa (para lá das palavras-chave), personalização de texto (o Google gera títulos e descrições a partir do site) e expansão do URL final (escolhe a página de destino). A expansão de URL exige a personalização de texto ligada. Há exclusões e inclusões de marca e exclusões de URL. Confiança: Alta (ajuda do Google).
- **Anúncios Dinâmicos de Pesquisa (DSA)** estão a ser substituídos pelo AI Max: já não se criam novos e as campanhas antigas são atualizadas automaticamente. As fontes não concordam na data final (setembro de 2026 ou fevereiro de 2027). Confiança: Alta quanto à mudança, Média quanto à data.
- Há um **AI Brief** para orientar o AI Max com instruções em texto, e relatórios novos de termos de pesquisa e combinações de anúncios (out. 2026). Confiança: Média.
- **Performance Max** mostra agora o desempenho por canal (Pesquisa, Display, YouTube, Discover, Maps) e mais detalhe por grupo de recursos, mas continua sem controlo de palavras-chave. Confiança: Média.
- **Campanhas Locais** foram integradas no **Performance Max com objetivos de loja**: ligam ao Perfil da Empresa, otimizam para visitas, chamadas e pedidos de direções. Uma campanha de loja com "otimização para clientes locais" não pode otimizar para conversões online ao mesmo tempo. Confiança: Alta (ajuda do Google).
- **Anúncios no Modo IA** da pesquisa do Google chegam através do AI Max e do Performance Max. Confiança: Média.
- **Anúncios só de chamada** estão a ser descontinuados; usar recursos de chamada nos RSA. Confiança: Média.

## Escolher o tipo de campanha

| Situação | Campanha | Licitação inicial |
|---|---|---|
| Há pesquisas pelo serviço na zona (ex.: "cabeleireiro Lisboa", "coloração Benfica") | Pesquisa, com AI Max (correspondência alargada de termos ligada, URL fixo no início) | Maximizar conversões; passar a CPA alvo depois de ~30 conversões em 30 dias |
| Pesquisas pelo nome da marca | Pesquisa só de marca (grupo próprio, orçamento pequeno) | Maximizar cliques com CPC máximo ou parcela de impressões |
| Negócio local com Perfil da Empresa forte e objetivo de visitas, chamadas, direções | Performance Max com objetivos de loja | Maximizar valor de conversão / conversões |
| Venda online (curso, loja) com volume de conversões | Performance Max (com exclusões de marca) + Pesquisa | Maximizar conversões ou ROAS alvo |
| Criar procura, mostrar vídeo, remarketing visual | Demand Gen (YouTube, Discover, Gmail) | Maximizar conversões ou cliques |
| Notoriedade com vídeo longo | YouTube (vídeo) | CPV ou CPM alvo |

**Regra Empower para negócio local com orçamento até ~20 €/dia:** uma única campanha de Pesquisa, 2 a 4 grupos de anúncios por tema de serviço + 1 de marca (se houver procura de marca), zona com raio à volta do espaço, recursos de local e de chamada. Performance Max só depois de a Pesquisa ter conversões e se o orçamento passar ~20 a 30 €/dia, porque com pouco orçamento o PMax tende a gastar em Display e YouTube de baixa intenção.

## Configurações padrão (Pesquisa local)

- Redes: só Pesquisa Google. Desligar parceiros de pesquisa e rede de Display.
- Localização: "presença: pessoas que estão ou estão regularmente nas localizações segmentadas" (não "interesse"). Raio de 5 a 15 km em cidade, 15 a 30 km fora.
- Idiomas: português e inglês (em Lisboa e Porto há procura em inglês).
- Horário: todo o dia no início; ajustar depois com os dados. Se as marcações forem por chamada, limitar os recursos de chamada ao horário de atendimento.
- AI Max: correspondência alargada de termos ligada com negativas fortes; personalização de texto ligada só depois de rever o site (gera texto a partir dele); expansão de URL desligada no início se o site tiver páginas que não são de marcação.
- Exclusões de marca: excluir marcas de concorrentes se não se quer aparecer nessas pesquisas (ou incluir de propósito numa campanha à parte).

## Licitação e aprendizagem

- Começar em Maximizar conversões sem alvo durante 2 a 3 semanas.
- Passar a CPA alvo com valor ~10 a 20% acima do CPA real observado, depois de ~30 conversões em 30 dias.
- Alterações de orçamento até ~20% de cada vez; mudanças de estratégia reiniciam a aprendizagem (cerca de 1 a 2 semanas).

## Escalar

- Mais orçamento na campanha que está dentro do CPA e limitada pelo orçamento (ver "parcela de impressões perdida por orçamento").
- Novos grupos por serviço com procura confirmada.
- Acrescentar PMax de loja ou Demand Gen de remarketing quando a Pesquisa estiver estável.

## Fontes

- [Optimize Google Ads with AI Max for Search campaigns, Google Ads Help](https://support.google.com/google-ads/answer/15910187?hl=en&)
- [AI Max enablement and URL exclusions, Google Ads Help](https://support.google.com/google-ads/answer/15909989?hl=en)
- [Google's Dynamic Search Ads are upgrading to AI Max, Google Blog](https://blog.google/products/ads-commerce/dsa-upgrade-to-ai-max-2026/)
- [AI Max for Search campaigns, Google Ads API docs](https://developers.google.com/google-ads/api/docs/campaigns/ai-max-for-search-campaigns/getting-started?authuser=3)
- [Create a Performance Max campaign with a store goal, Google Ads Help](https://support.google.com/google-ads/answer/13717300)
- [Local customer optimization in PMax for store goals, Relevant Audience](https://www.relevantaudience.com/google-ads-en/google-local-customer-optimization-pmax-store-goals/)
- [Every Google Ads Change in 2026, Common Thread](https://commonthreadco.com/blogs/coachs-corner/google-ads-changes-2026)
- [Google Ads Updates 2026, ALM Corp](https://almcorp.com/blog/google-ads-updates-2026/)
- [Latest Google Ads product announcements](https://business.google.com/us/accelerate/announcements/)
