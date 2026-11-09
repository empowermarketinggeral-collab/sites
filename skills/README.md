# Skills da Empower (anúncios e funis)

Fonte das skills que se carregam no claude.ai. Editar aqui, fazer commit e carregar a nova versão.

| Skill | Para quê |
|---|---|
| `anuncios-meta/` | Campanhas Meta (Facebook, Instagram, WhatsApp): estrutura, criativos, tracking, políticas, custos em Portugal, leitura de resultados |
| `anuncios-google/` | Campanhas Google Ads: Pesquisa com AI Max, Performance Max (incluindo loja), Demand Gen, YouTube, palavras-chave, conversões, Consent Mode |
| `funil-de-marca/` | O "agente": de um objetivo de negócio até ao funil completo, validado em painel e entregue em dashboard (que vai para o Big Boss) |

## Estúdio de Funis

Painel interativo de todas as marcas: https://claude.ai/artifact/Hk6WkmP3Lai5nL98zTDnth (fonte em `funil-de-marca/painel/estudio-de-funis.html`). Para atualizar, publicar de novo este ficheiro no mesmo endereço.

## Carregar no claude.ai

1. Comprimir a pasta da skill em `.zip` (a pasta inteira, com o `SKILL.md` na raiz do zip).
2. claude.ai → Definições → Capacidades → Skills → Carregar skill.
3. Ao atualizar uma skill, carregar o novo zip por cima da antiga.

```bash
cd skills && for s in anuncios-meta anuncios-google funil-de-marca; do (cd "$s" && zip -r "../$s.zip" .); done
```

## Manter atualizadas

Cada skill de anúncios tem `references/atualizar.md` (procedimento) e `references/changelog.md` (registo). A data da última verificação está no topo de cada `SKILL.md`. Uma tarefa agendada mensal faz a pesquisa de novidades, atualiza as referências, regista no changelog e faz commit; depois é só carregar os zips novos.
