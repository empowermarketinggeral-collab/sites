# Estrutura de campanhas Meta

Verificado em 2026-11-08. Fontes no fim. Confiança indicada em cada ponto.

## Como a Meta funciona agora (o essencial)

- **Advantage+ é o padrão.** A criação de campanhas está unificada: as campanhas de Vendas, Leads e Apps começam com Advantage+ ligado (orçamento, público e posicionamentos automáticos). Ao restringir público ou posicionamentos, a campanha passa a "Advantage+ desligado". Confiança: Alta (ajuda da Meta citada por várias fontes).
- **Advantage+ Shopping passou a chamar-se Advantage+ Sales** e voltou a ter conjuntos de anúncios (com limite de anúncios por conjunto; as fontes não concordam no número exato, confirmar no Gestor). Confiança: Média.
- **Andromeda** (o sistema que escolhe que anúncio mostrar a quem) dá muito mais peso ao criativo. Criativos parecidos são tratados como um só. Consequência: diversidade real de ângulos e formatos vale mais do que muitos conjuntos de públicos. Confiança: Média (fontes de agências, números da Meta citados em segunda mão).
- **Segmentação detalhada funciona como sugestão** dentro do Advantage+ Audience: a Meta pode sair dela se achar que encontra resultados melhores. Confiança: Média.
- **Atribuição:** o clique que conta para atribuição é o clique no link. Outras interações (gostos, guardar) contam como "engage-through", em janela curta. Ao comparar com o hub ou com o Google, usar 7 dias clique como padrão e olhar para 1 dia clique como verificação. Confiança: Média.
- **UE, desde janeiro de 2026:** os utilizadores na UE podem escolher anúncios menos personalizados. Parte do público vê anúncios com menos dados, por isso o alcance segmentado é menos preciso e o criativo e o contexto pesam ainda mais. Confiança: Alta quanto à mudança, Baixa quanto ao impacto (sem números públicos).

## Escolher o objetivo

| Objetivo de negócio | Objetivo de campanha | Evento de otimização | Notas |
|---|---|---|---|
| Marcações num serviço local (salão, clínica) | Leads | Formulário instantâneo (com "maior intenção") ou conversa WhatsApp, ou `Schedule`/`Lead` no site | Para negócio local com pouco volume, WhatsApp ou formulário costumam dar volume mais barato; o site dá leads mais qualificados |
| Candidaturas, inscrições, ebook gratuito | Leads | `Lead` no site (Pixel + CAPI) ou formulário instantâneo | Formulário com pergunta de qualificação para filtrar |
| Venda de curso ou produto (Hotmart, loja) | Vendas (Advantage+ Sales) | `Purchase` (ou `InitiateCheckout` enquanto não houver ~50 compras/semana) | Ver nota de volume abaixo |
| Aquecer público novo, lançamento | Envolvimento (visualizações de vídeo) ou Alcance | ThruPlay / alcance | Só como apoio, com orçamento pequeno, para alimentar remarketing |
| Seguidores e mensagens | Envolvimento → Mensagens | Conversas iniciadas | Útil para marcas onde a venda se fecha em conversa |

**Volume mínimo para otimizar bem:** a referência prática é cerca de 50 eventos de otimização por semana por conjunto. Com orçamento pequeno, subir no funil (otimizar para um evento mais frequente, ex.: `Lead` em vez de `Purchase`, ou `InitiateCheckout`) e voltar a descer quando houver volume. Confiança: Média (regra de praticantes, a Meta fala em "cerca de 50" para sair da aprendizagem).

## Estrutura padrão Empower

Simples por defeito. Cada divisão a mais divide os dados e atrasa a aprendizagem.

**Orçamento até ~30 €/dia (a maior parte dos negócios locais):**
- 1 campanha de conversão, Advantage+ ligado, 1 conjunto, 6 a 10 anúncios de 3 a 5 ângulos diferentes.
- Remarketing feito dentro da mesma campanha (a Meta já reaproveita quem interagiu). Não criar campanha de remarketing à parte com menos de ~5 €/dia, porque não sai da aprendizagem.

**Orçamento ~30 a 150 €/dia:**
- Campanha de conversão (70 a 80%) com Advantage+.
- Campanha de remarketing manual (10 a 20%): quem visitou o site, viu 50% dos vídeos ou interagiu com o perfil nos últimos 30 a 60 dias, com criativos de prova e objeção.
- Opcional: campanha de teste de criativos (10%) com orçamento fixo por conjunto, para validar ângulos novos antes de passar para a principal.

**Lançamentos (curso, produto com data):** aquecer 2 a 3 semanas antes com conteúdo (vídeo, envolvimento), captar leads para lista de espera, abrir carrinho com campanha de vendas e remarketing intenso nos dias de abertura e fecho.

## Negócio local (salão, clínica, loja física)

- Zona: raio de 10 a 20 km à volta da morada, ou concelhos concretos. Excluir zonas sem acesso fácil.
- Idade e género: definir só como sugestão dentro do Advantage+ Audience (a segmentação rígida corta alcance e encarece). Exceção: quando a oferta é claramente para um segmento (ex.: serviço só feminino), limitar mesmo.
- Posicionamentos: automáticos (Advantage+). Garantir criativo vertical 9:16 para Reels e Stories e 4:5 para feed.
- Destino: página de marcação com o evento `Schedule`, WhatsApp com mensagem pré-preenchida, ou formulário instantâneo com 2 a 3 perguntas.

## Fase de aprendizagem e alterações

- Não mexer em orçamento mais de ~20 a 30% de cada vez nem com mais frequência do que a cada 3 a 4 dias.
- Acrescentar anúncios novos não reinicia a campanha inteira; mudar público, evento ou orçamento grande reinicia.
- Dar pelo menos 7 dias ou ~50 eventos antes de julgar uma campanha. Para anúncios individuais, ver `leitura.md`.

## Escalar

- Vertical: subir orçamento 20% a cada 3 a 4 dias enquanto o custo por resultado se mantém dentro da meta.
- Horizontal: novos ângulos e formatos na mesma campanha (preferível a duplicar campanhas).
- Quando um anúncio cansa (frequência acima de ~3 em 7 dias para público frio local, CTR a cair), substituir por novo ângulo, não pela mesma ideia com outra cor.

## Fontes

- [Meta Ads Updates 2026, adadvisor.ai, out. 2026](https://adadvisor.ai/blog/meta-ads-updates-2026)
- [Meta Advantage+ Explained 2026, adadvisor.ai](https://adadvisor.ai/blog/meta-advantage-plus)
- [Meta Ads Campaign Structure 2026: After Andromeda, Tribe Up](https://tribeupacademy.com/meta-ads-2026-campaign-structure/)
- [Meta Andromeda Update 2026, Skaleit](https://skaleit.agency/blog/meta-andromeda-update-2026-what-changed/)
- [Meta Ads Updates 2026, Hawky](https://hawky.ai/blog/meta-ads-updates-2026)
- [Meta rewrites its EU ad model, eMarketer](https://www.emarketer.com/content/meta-rewrites-its-eu-ad-model-regulators-tighten-screws)
- [Meta to give EU users choice over personalised ads from January 2026, Nairametrics](https://nairametrics.com/2025/12/08/meta-to-give-eu-users-choice-over-personalised-ads-from-january-2026/)

Nota: a maior parte das fontes são blogs de agências. Antes de decisões grandes de conta, confirmar no Centro de Ajuda para Empresas da Meta.
