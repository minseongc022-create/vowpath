# Effiroad checkout launch checklist

Run after merging checkout fixes:

```bash
node scripts/verify-checkout-prod.mjs https://effiroad.com
```

## Automatic (code)

On **Vercel Production** with valid `PADDLE_API_KEY` + price IDs, paid checkout turns on even if `NEXT_PUBLIC_BETA=true` was baked into an old build. Override anytime with `BILLING_ENABLED=false`.

## Vercel env (Production)

| Variable | Required | Notes |
|----------|----------|--------|
| `PADDLE_ENV` | yes | `production` |
| `PADDLE_API_KEY` | yes | `pdl_live_apikey_...` |
| `PADDLE_PRICE_ID_UNLIMITED` | yes | live price |
| `PADDLE_PRICE_ID_FLEX` | yes | live price |
| `PADDLE_PRICE_ID_FLEX_USAGE` | yes | $11/ booking |
| `PADDLE_CLIENT_TOKEN` | yes* | Server runtime token for Paddle.js (preferred — no client rebuild) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | yes* | Alternative; baked into client bundle on deploy |
| `NEXT_PUBLIC_PADDLE_ENV` | yes | `production` |
| `PADDLE_WEBHOOK_SECRET` | yes | webhook signature |
| `NEXT_PUBLIC_BETA` | optional | `false` on next deploy (or rely on auto-enable) |
| `BILLING_ENABLED` | optional | `true` / `false` override |

Redeploy after changing `NEXT_PUBLIC_*` variables. `PADDLE_CLIENT_TOKEN` takes effect on the next serverless invocation (no redeploy).

## Paddle dashboard

1. Complete seller verification.
2. **Checkout → enabled** (fixes `transaction_checkout_not_enabled`).
3. Default payment link: `https://effiroad.com/pay`
4. Webhook: `https://effiroad.com/api/paddle/webhook`

## Success criteria

- `GET /api/checkout/status` → `"mode": "ready"` (or `paddle_checkout_disabled` until Paddle enables checkout)
- Click Subscribe → Paddle overlay opens
- After payment → `/dashboard/settings?transaction_id=...`
