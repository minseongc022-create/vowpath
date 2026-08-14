# Giu (giucuu.com) — production setup

Food rescue marketplace for HCMC. Stack: Next.js on Vercel, KV store, **Stripe** (default live payments), optional VNPay, optional Twilio SMS.

## Required env (Vercel)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | 32+ chars — JWT sessions (`openssl rand -hex 32`) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Attach **Vercel KV** in Storage tab |
| `NEXT_PUBLIC_GIU_URL` | `https://www.giucuu.com` |
| `NEXT_PUBLIC_GIU_HOST` | `giucuu.com` |
| `CRON_SECRET` | Same as Effiroad — external cron auth |

## Stripe — live online payments (Korean solo OK)

**Recommended.** No Vietnamese business entity required.

### 1. Stripe account

1. Register at [dashboard.stripe.com/register](https://dashboard.stripe.com/register) — Korea, individual or sole prop.
2. Start in **test mode** (`sk_test_…`), then switch to live after one test checkout.

### 2. Vercel env (Production)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (step 3) |
| `GIU_PAYMENT_DEMO` | Unset or `0` when keys are set |

Optional: `GIU_PAYMENT_PROVIDER=stripe` to force Stripe when multiple backends are configured.

### 3. Stripe webhook

Dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://www.giucuu.com/api/giu/payments/stripe/webhook`
- Event: `checkout.session.completed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Redeploy & verify

1. Redeploy Vercel after env changes.
2. Open a box on giucuu.com → **카드로 결제하기** → Stripe Checkout opens (not instant demo code).
3. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Customers pay in **VND** on Stripe Checkout (Visa / Mastercard / international cards). Settlement goes to your **Korean Stripe balance** (converted from VND).

### Demo mode (before Stripe keys)

- Omit `STRIPE_SECRET_KEY` → instant fake payment (`GIU_PAYMENT_DEMO=1` also forces demo).
- Set `GIU_PAYMENT_DEMO=0` to disable demo when testing live keys.

## VNPay (optional — Vietnam business only)

Use only if you have a **Vietnamese registered merchant** (MoMo / VietQR / local wallets).

| Variable | Example |
|----------|---------|
| `VNPAY_TMN_CODE` | Merchant terminal code |
| `VNPAY_HASH_SECRET` | Hash secret |
| `VNPAY_URL` | Optional sandbox default |

Register in VNPay portal:

- Return: `https://www.giucuu.com/api/giu/payments/vnpay/return`
- IPN: `https://www.giucuu.com/api/giu/payments/vnpay/ipn`

Set `GIU_PAYMENT_PROVIDER=vnpay` to prefer VNPay over Stripe.

**Auto priority when unset:** Stripe → VNPay → demo.

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

## Escrow (Thanh toán an toàn)

Payment flow for HCMC launch:

1. Customer pays via Stripe (or VNPay) → `settlementStatus: held`
2. Customer picks up with code → merchant taps **Đã lấy** → `settlementStatus: released`
3. Cancel before pickup → `settlementStatus: refunded`

In-app status only — **not** automatic bank payout to merchants.

## Launch checklist

1. Deploy from `main` (VN-only product at giucuu.com)
2. Vercel KV + env vars above
3. **Stripe test checkout** end-to-end
4. cron-job.org → `giu-reservation-expiry` every 60s
5. Swap Stripe to live keys
6. Onboard 5–20 real bakeries (Quận 1·3·7) via Zalo
