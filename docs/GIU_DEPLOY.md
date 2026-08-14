# Giu (giucuu.com) — production setup

Food rescue marketplace for HCMC. Stack: Next.js on Vercel, KV store, VNPay, optional Twilio SMS.

## Required env (Vercel)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | 32+ chars — JWT sessions (`openssl rand -hex 32`) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Attach **Vercel KV** in Storage tab |
| `NEXT_PUBLIC_GIU_URL` | `https://www.giucuu.com` |
| `NEXT_PUBLIC_GIU_HOST` | `giucuu.com` |
| `CRON_SECRET` | Same as Effiroad — external cron auth |

## Real payments (pick one)

Giu supports **two live backends**. You only need **one** — no Vietnamese business required for Stripe.

| Backend | Who can sign up | Best for |
|---------|-----------------|----------|
| **Stripe** (recommended for Korean solo) | [stripe.com](https://stripe.com) — individual or sole prop in Korea | Visa/Mastercard from Vietnam + global cards; settles to your KR bank |
| **VNPay** | Vietnamese registered business only | MoMo, VietQR, local VN wallets |

**Auto priority:** Stripe if `STRIPE_SECRET_KEY` is set, else VNPay if `VNPAY_*` is set, else demo.

Override with `GIU_PAYMENT_PROVIDER=stripe` or `vnpay`.

### Stripe — Korean solo operator (no VN entity)

1. Create a Stripe account at [dashboard.stripe.com/register](https://dashboard.stripe.com/register) (Korea, individual OK).
2. Vercel Production env:

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys → Secret key (`sk_live_…` or `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (see below) |
| `GIU_PAYMENT_DEMO` | `0` or unset once keys are set |

3. **Webhook** (Dashboard → Developers → Webhooks → Add endpoint):

- URL: `https://www.giucuu.com/api/giu/payments/stripe/webhook`
- Events: `checkout.session.completed`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

4. Test with Stripe **test mode** keys first (`sk_test_…`), then swap to live.

Customers pay in **VND** on Stripe Checkout (international cards). MoMo/VietQR labels in the UI still work as checkout entry points but settlement goes through Stripe when it is the active backend.

### VNPay (Vietnam business only)

When both are set, checkout redirects to VNPay sandbox/production:

| Variable | Example |
|----------|---------|
| `VNPAY_TMN_CODE` | Merchant terminal code from VNPay |
| `VNPAY_HASH_SECRET` | Hash secret from VNPay |
| `VNPAY_URL` | Optional — default sandbox `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |

**VNPay merchant portal — register URLs:**

- Return URL: `https://www.giucuu.com/api/giu/payments/vnpay/return`
- IPN URL: `https://www.giucuu.com/api/giu/payments/vnpay/ipn`

MoMo / VietQR / card in the UI all route through VNPay.

### Demo mode (local / before VNPay keys)

- Omit `VNPAY_*` → instant demo payment (same as `GIU_PAYMENT_DEMO=1`)
- Set `GIU_PAYMENT_DEMO=0` to force VNPay-only (fails if keys missing)

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

1. Customer pays via VNPay → `settlementStatus: held`
2. Customer picks up with code → merchant taps **Đã lấy** → `settlementStatus: released`
3. Cancel before pickup → `settlementStatus: refunded`

This is the same trust model planned for Korea later; **production focus is Vietnam only** for now.

## Launch checklist

1. Deploy from `main` (VN-only product at giucuu.com)
2. Vercel KV + env vars above
3. VNPay sandbox test transaction end-to-end
4. cron-job.org → `giu-reservation-expiry` every 60s
5. Onboard 5–20 real bakeries (Quận 1·3·7) via Zalo
6. Target: **30+ successful pickups/week** in HCMC before any Korea expansion
