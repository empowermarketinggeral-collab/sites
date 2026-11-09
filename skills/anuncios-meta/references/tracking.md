# Tracking de anúncios Meta

Verificado em 2026-11-08.

## Peças

1. **Pixel da Meta no site**, carregado só com consentimento de cookies de marketing (já é assim nos sites Empower: `src/data/site.json` → `tracking.metaPixelId`; o banner aparece sozinho).
2. **Conversions API (CAPI)**: envia os mesmos eventos a partir do servidor, para recuperar o que o browser perde (bloqueadores, iOS, recusa de cookies parcial). Na UE só se enviam dados pessoais com base legal (consentimento). Opções: integração da plataforma (Hotmart, Shopify), Gateway de CAPI, ou envio a partir do hub/Big Boss. Ainda não existe nos sites Empower: assinalar como ponto em aberto quando a campanha depender de conversões no site.
3. **Eventos padrão usados pela Empower** (já mapeados nos sites):
   - `data-track="lead"` → `Lead`
   - `data-track="agendamento"` → `Schedule` (página `/reuniao-agendada`, uma vez por sessão)
   - `data-track="contacto"` → `Contact`
   - Checkout Hotmart → `InitiateCheckout` no site; a compra (`Purchase`) chega pela integração da Hotmart com o Pixel ou pela CAPI.
4. **Formulários instantâneos** (Leads sem sair do Instagram/Facebook): os leads ficam na Meta. Ligar ao Big Boss ou exportar todos os dias. Usar o tipo "maior intenção" (ecrã de revisão) e 1 pergunta de qualificação.
5. **WhatsApp / mensagens**: o resultado é "conversa iniciada", não marcação. Registar à mão (ou no Big Boss) quantas conversas viram marcação para calcular o custo por marcação real.

## UTMs e nomes

Usar sempre o padrão de `SKILL.md`. O hub lê `utm_campaign`, `utm_source` e `utm_content` e liga cada lead e cada venda à campanha. Sem UTMs, o hub mostra só "meta / paid_social" sem detalhe.

## Checklist antes de lançar

- [ ] Pixel ativo e a disparar o evento de otimização (Gestor de Eventos → Testar eventos)
- [ ] Domínio verificado no Gestor de Negócios
- [ ] Evento de otimização tem prioridade na configuração de eventos
- [ ] UTMs no campo "Parâmetros de URL" do anúncio
- [ ] Página de destino tem `data-track` certo e o site está registado no hub
- [ ] Formulário instantâneo ligado ao CRM ou rotina de exportação definida
- [ ] Teste: submeter um lead real de teste e ver que aparece na Meta, no hub e no Big Boss
