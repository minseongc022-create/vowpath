# Effiroad checkout launch checklist (Lemon Squeezy)

Run after merging billing changes:

```bash
node scripts/verify-checkout-prod.mjs https://effiroad.com
```

## Automatic (code)

On **Vercel Production** with valid `LEMON_SQUEEZY_API_KEY` + store + variant IDs, paid checkout turns on even if `NEXT_PUBLIC_BETA=true` was baked into an old build. Override anytime with `BILLING_ENABLED=false`.

While **Lemon Squeezy store approval** is pending, leave variant env vars unset — the site stays on **Public beta** (`/signup` free). Voice metering and dispatch billing logic still run in-app; usage records to LS start once variants exist.

## Vercel env (Production)

| Variable | Required | Notes |
|----------|----------|--------|
| `LEMON_SQUEEZY_API_KEY` | yes | Settings → API |
| `LEMON_SQUEEZY_STORE_ID` | yes | Settings → Stores → Copy ID |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | yes | Webhooks → signing secret |
| `LEMON_SQUEEZY_VARIANT_ID_LITE` | when live | $39/mo base |
| `LEMON_SQUEEZY_VARIANT_ID_LITE_USAGE` | when live | $18/dispatch · usage billing |
| `LEMON_SQUEEZY_VARIANT_ID_FLEX` | when live | $69/mo base |
| `LEMON_SQUEEZY_VARIANT_ID_FLEX_USAGE` | when live | $12/dispatch · usage billing |
| `LEMON_SQUEEZY_VARIANT_ID_PRO` | when live | $299/mo · 25 dispatches incl. |
| `LEMON_SQUEEZY_VARIANT_ID_PRO_OVERAGE` | when live | $15/dispatch beyond cap |
| `LEMON_SQUEEZY_VARIANT_ID_SCALE` | when live | $399/mo · 40 dispatches incl. |
| `LEMON_SQUEEZY_VARIANT_ID_SCALE_OVERAGE` | when live | $12/dispatch beyond cap |
| `LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER` | when live | $49/mo · 250 min |
| `LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER_OVERAGE` | when live | $0.25/min |
| `LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO` | when live | $149/mo · 1000 min |
| `LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO_OVERAGE` | when live | $0.20/min |
| `NEXT_PUBLIC_BETA` | optional | `false` on next deploy (or rely on auto-enable) |
| `BILLING_ENABLED` | optional | `true` / `false` override |

Founder cohort variants (`LEMON_SQUEEZY_VARIANT_ID_BETA_*`) — add when you create founder-rate products.

## Lemon Squeezy dashboard (after approval)

1. Create **subscription products** for each plan above (monthly).
2. For dispatch usage (Lite/Flex) and overage (Pro/Scale/Voice): add **usage-based** variants — aggregation **Sum of usage during period**.
3. Attach usage variants to subscriptions (multi-item checkout or add-on) so webhooks expose a usage `subscription_item` id.
4. Webhook URL: `https://effiroad.com/api/lemon-squeezy/webhook`
   - Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_failed`
5. Copy each variant ID → matching Vercel env → redeploy.

## Success criteria

- `GET /api/checkout/status` → `"mode": "ready"`
- Click Subscribe → redirects to Lemon Squeezy checkout
- After payment → `/dashboard/settings?checkout=success&plan=…`
- Webhook updates `subscriptionStatus: active` on matching email
