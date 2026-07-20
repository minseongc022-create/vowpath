# Effiroad checkout launch checklist

Run after merging checkout fixes:

```bash
node scripts/verify-checkout-prod.mjs https://effiroad.com
```

## Automatic (code)

On **Vercel Production** with valid `PADDLE_API_KEY` + price IDs, paid checkout turns on even if `NEXT_PUBLIC_BETA=true` was baked into an old build. Override anytime with `BILLING_ENABLED=false`.

Price IDs are **never hard-coded** — they come from Vercel env (`PADDLE_PRICE_ID_*`). Server API host follows `PADDLE_ENV` (`api.paddle.com` when `production`).

## Live migration (Paddle step 01) — manual (no MCP in this repo)

This environment has **no** `paddle-sandbox` / `paddle-live` MCP. Do catalog + secrets in the vendor dashboard, then paste IDs into Vercel.

### Create live Prices (Catalog → Prices → New price)

Match `lib/constants.ts`:

| Env key | Amount |
|---------|--------|
| `PADDLE_PRICE_ID_LITE` | $29/mo |
| `PADDLE_PRICE_ID_LITE_USAGE` | $18 / dispatch |
| `PADDLE_PRICE_ID_FLEX` | $55/mo |
| `PADDLE_PRICE_ID_FLEX_USAGE` | $8 / dispatch |
| `PADDLE_PRICE_ID_PRO` (+ `UNLIMITED` alias) | $149/mo |
| `PADDLE_PRICE_ID_PRO_OVERAGE` | $12 / dispatch |
| `PADDLE_PRICE_ID_SCALE` | $299/mo |
| `PADDLE_PRICE_ID_SCALE_OVERAGE` | $9 / dispatch |
| `PADDLE_PRICE_ID_BETA_INTRO` | $119/mo |
| `PADDLE_PRICE_ID_BETA_SCALE` | $279/mo |
| `PADDLE_PRICE_ID_BETA_FLEX` / `_USAGE` | $49 + $7 |
| `PADDLE_PRICE_ID_BETA_LITE` / `_USAGE` | $25 + $15 |
| `PADDLE_PRICE_ID_BETA_LOCKED` | $149/mo |
| `PADDLE_PRICE_ID_BETA_SCALE_OVERAGE` | $7 / dispatch |

Do **not** delete old live prices if any subscriptions exist — create new `pri_` and point env at them.

### Vercel Production env

| Variable | Required | Notes |
|----------|----------|--------|
| `PADDLE_ENV` | yes | `production` |
| `NEXT_PUBLIC_PADDLE_ENV` | yes | `production` |
| `PADDLE_API_KEY` | yes | `pdl_live_...` |
| `PADDLE_CLIENT_TOKEN` | yes* | `live_...` preferred (no rebuild) |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | yes* | Alternative; needs redeploy |
| `PADDLE_WEBHOOK_SECRET` | yes | Existing destination secret — never rotate by recreating |
| `PADDLE_PRICE_ID_*` | yes | Live `pri_...` from table above |
| `BILLING_ENABLED` | optional | `true` / `false` override |

Redeploy after changing `NEXT_PUBLIC_*`.

### Paddle dashboard (live)

1. Complete seller verification (domain + identity).
2. **Checkout → enabled** (fixes `transaction_checkout_not_enabled`).
3. Default payment link: `https://effiroad.com/pay`
4. Request domain approval for `effiroad.com` (and `www` if used).
5. Webhook destination: `https://effiroad.com/api/paddle/webhook` (reuse if exists).
6. Payment methods + payout bank under Checkout / Business account.

Webhook auth is **signature** (`PADDLE_WEBHOOK_SECRET`). Vercel serverless does not IP-allowlist; live IPs are at `https://api.paddle.com/ips` if you add a WAF later.

## Success criteria

- `GET /api/checkout/status` → `"mode": "ready"`
- Click Subscribe → Paddle overlay opens
- After payment → `/dashboard/settings?transaction_id=...`

## Pre-verification URLs

- Terms: https://effiroad.com/terms
- Privacy: https://effiroad.com/privacy
- Refund: https://effiroad.com/refund

## Step 03 (live $0 test)

Only after verification + domain approval + `mode: ready`. Use a 100% discount in live; do **not** open real customers until that passes.
