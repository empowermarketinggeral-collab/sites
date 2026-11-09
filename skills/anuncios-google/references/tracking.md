# Tracking Google Ads

Verificado em 2026-11-08.

## Peças

1. **Etiqueta Google Ads no site**, só com consentimento, com **Consent Mode v2** (sinais `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`). Obrigatório para tráfego do EEE: sem os sinais, o Google deixa de usar os dados para medir e criar públicos. Nos sites Empower já está feito: `src/data/site.json` → `tracking.googleAdsId` e `googleAdsLeadLabel`; o banner de cookies envia o consentimento.
2. **Conversões principais** (as que a licitação usa): uma por objetivo de negócio. Para negócio local: marcação (`agendamento`), lead (`lead`), chamada a partir do anúncio (conversão de chamada, mínimo 30 a 60 segundos). Cliques em "direções" e "site" do Perfil da Empresa ficam como secundárias.
3. **Conversões otimizadas** (enhanced conversions): enviam o email ou telefone (com hash) do formulário para melhorar a correspondência. O Google está a juntar as conversões otimizadas para web e para leads numa só definição. Uploads de leads offline devem passar para a Data Manager API. Confiança: Alta (ajuda do Google).
4. **Conversões offline** (fase 2): quando o Big Boss marca um lead como cliente, enviar ao Google como conversão offline (com gclid ou dados com hash). Aumenta muito a qualidade da otimização em negócios de marcação. Ponto em aberto até existir essa integração.
5. **Perfil da Empresa** ligado à conta Google Ads (recursos de local e objetivos de loja).
6. **Google Analytics 4** ligado à conta, para importar públicos e ver o percurso.

## UTMs e hub

Ver padrão em `SKILL.md`. O hub regista `utm_campaign` e liga leads e vendas à campanha. Manter marcação automática (gclid) ligada em paralelo.

## Checklist antes de lançar

- [ ] Etiqueta e conversão principal a disparar (Assistente de etiquetas / estado "Ativa")
- [ ] Consent Mode v2 verificado (no diagnóstico de consentimento da conta)
- [ ] Só as conversões certas marcadas como "principais"
- [ ] Conversões otimizadas ligadas
- [ ] Perfil da Empresa ligado e com morada, horário e fotos atualizados
- [ ] Modelo de acompanhamento com UTMs
- [ ] Teste: lead real de teste aparece no Google Ads (até 24 h), no hub e no Big Boss
