# Webhook da Kiwify — notas da documentação oficial

Fonte: https://docs.kiwify.com.br/api-reference/webhooks/receiving.md e
https://docs.kiwify.com.br/api-reference/webhooks/subscription-events.md (consultadas em 19/11/2026).

## Envio e validação
- `POST` com JSON no corpo; a Kiwify acrescenta `?signature=<hmac-sha1-hex>` na URL.
- O token NÃO vem na requisição. `signature = HMAC-SHA1(chave = token, mensagem = corpo cru)`, hex minúsculo (40 chars).
- Validar sobre os bytes crus, ANTES do JSON.parse, com comparação em tempo constante. Inválido → 401.
- Vetor de teste: token `kiwify-token-de-teste`, corpo
  `{"order_id":"9b1c2d3e-0000-4000-8000-000000000001","order_status":"paid","webhook_event_type":"order_approved"}`
  → `bf18f352a4f981b91dfa3f6d8742a81080ab8c86`.
- Sem sandbox. Usar "Testar Webhook" no painel (dados fictícios) e conferir em "Ver logs".

## Entrega
- 2xx confirma. Timeout 40s. Redirecionamentos não são seguidos. Falhas são reenviadas (1 a 10 min).
- Idempotência: `order_id` + `webhook_event_type` (trial: `subscription_id` + `webhook_event_type`).
- Assinatura não protege contra replay → a deduplicação protege.
- Troca de token: aceitar token antigo OU novo por ~1 dia.

## Gatilho → `webhook_event_type` → `order_status`
| Gatilho | webhook_event_type | order_status |
|---|---|---|
| compra_aprovada | order_approved | paid |
| compra_recusada | order_rejected | refused |
| compra_reembolsada | order_refunded | refunded |
| chargeback | chargeback | chargedback |
| subscription_canceled | subscription_canceled | status do pedido mais recente |
| subscription_late | subscription_late | idem |
| subscription_renewed | subscription_renewed | idem |

## Assinaturas
- Cada cobrança gera `order_id` novo; `subscription_id` (raiz do JSON) é fixo.
- Renovação paga: `compra_aprovada` + `subscription_renewed`; `Subscription.customer_access.access_until` = fim do novo período.
- Renovação recusada: `compra_recusada` + `subscription_late` (repete a cada tentativa); esgotou → `subscription_canceled`.
- Cancelamento: período pago continua valendo até `customer_access.access_until`. Pode chegar 2x.
- Reembolso/chargeback cancelam a assinatura automaticamente (chega também `subscription_canceled`).
  No chargeback, `customer_access` NÃO é zerado → remover acesso pelo evento `chargeback`.
- Objeto `Subscription`: `id`, `status` (active|waiting_payment|canceled|ended), `start_date`, `next_payment`,
  `customer_access.{has_access, active_period, access_until}`, `plan`, `charges`.
- Datas na raiz (`approved_date` etc.): horário de Brasília `YYYY-MM-DD HH:mm`. Dentro de `Subscription`: UTC ISO.

## Em aberto
- A documentação de webhooks NÃO detalha o objeto `Customer` (onde vem o e-mail).
  Confirmar com um payload real de "Testar Webhook" → "Ver logs" antes de implementar.

## Decisões de negócio (confirmadas pelo dono do produto)
- Compra aprovada / renovação paga → ativa; `current_period_end` = `Subscription.customer_access.access_until`.
- Atraso (`subscription_late`) → inativa NA HORA.
- Reembolso (`order_refunded`) e chargeback (`chargeback`) → inativa NA HORA.
- Cancelamento (`subscription_canceled`) → continua ativa ATÉ O FIM do período pago
  (`access_until`); depois disso fica inativa automaticamente.
