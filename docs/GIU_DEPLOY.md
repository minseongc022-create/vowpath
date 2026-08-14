# Giu (giucuu.com) — production setup

Food rescue marketplace for HCMC. Stack: Next.js on Vercel, KV store, **Lemon Squeezy** (default live payments), optional VNPay, optional Twilio SMS.

## Required env (Vercel)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | 32+ chars — JWT sessions (`openssl rand -hex 32`) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Attach **Vercel KV** in Storage tab |
| `NEXT_PUBLIC_GIU_URL` | `https://www.giucuu.com` |
| `NEXT_PUBLIC_GIU_HOST` | `giucuu.com` |
| `CRON_SECRET` | Same as Effiroad — external cron auth |

## Lemon Squeezy — live online payments (Korean solo OK)

**Recommended.** MoR — no Vietnamese business entity required. See **[GIU_LEMON_SQUEEZY.md](./GIU_LEMON_SQUEEZY.md)** for full checklist.

| Variable | Purpose |
|----------|---------|
| `LEMON_SQUEEZY_API_KEY` | Settings → API |
| `LEMON_SQUEEZY_STORE_ID` | Settings → Stores |
| `LEMON_SQUEEZY_VARIANT_ID_GIU` | One-time product variant for rescue boxes |
| `GIU_LEMON_SQUEEZY_WEBHOOK_SECRET` | Giu webhook signing secret (or reuse `LEMON_SQUEEZY_WEBHOOK_SECRET`) |
| `GIU_VND_PER_USD` | Optional — VND→USD for checkout (default `25000`) |
| `GIU_PAYMENT_PROVIDER` | Optional — `lemon_squeezy` to force |

**Giu webhook URL:** `https://www.giucuu.com/api/giu/payments/lemon-squeezy/webhook`  
**Event:** `order_created`

**Auto priority:** Lemon Squeezy → VNPay → demo.

### Demo mode (before LS keys)

- Omit `LEMON_SQUEEZY_VARIANT_ID_GIU` → instant fake payment
- Set `GIU_PAYMENT_DEMO=0` when testing live keys

## VNPay (optional — Vietnam business only)

| Variable | Example |
|----------|---------|
| `VNPAY_TMN_CODE` | Merchant terminal code |
| `VNPAY_HASH_SECRET` | Hash secret |
| `VNPAY_URL` | Optional sandbox default |

Register in VNPay portal:

- Return: `https://www.giucuu.com/api/giu/payments/vnpay/return`
- IPN: `https://www.giucuu.com/api/giu/payments/vnpay/ipn`

Set `GIU_PAYMENT_PROVIDER=vnpay` to prefer VNPay over Lemon Squeezy.

## SMS pickup codes (optional)

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `GIU_TWILIO_FROM` | Twilio number with **Vietnam SMS** geo enabled (+84) |

Without Twilio, codes still show in-app; SMS is logged only.

`GIU_SMS_PREVIEW=1` — log SMS in dev without sending.

## Cron — expire unpaid reservations

Every **60 seconds** (cron-job.org):

```
GET https://www.giucuu.com/api/cron/giu-reservation-expiry
Authorization: Bearer <CRON_SECRET>
```

Releases box inventory when payment not completed within 15 minutes.

See `CRON.md` and `config/cron.schedule.json`.

## Merchant auto-verify

After **3 successful pickups** (`da_lay`), merchant gets `verified: true` automatically.

## Escrow

1. Customer pays via Lemon Squeezy (or VNPay) → `settlementStatus: held`
2. Customer picks up with code → merchant confirms → `settlementStatus: released`
3. Cancel before pickup → `settlementStatus: refunded`

In-app status only — not automatic bank payout to merchants.

## Launch checklist

1. Deploy from `main`
2. Vercel KV + env vars above
3. Lemon Squeezy store approved + test checkout end-to-end
4. cron-job.org → `giu-reservation-expiry` every 60s
5. Swap to live LS keys after approval
6. Onboard HCMC merchants via Zalo
