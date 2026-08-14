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

## VNPay (real payments)

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

## Launch checklist

1. Merge `cursor/giu-auth-payment-43d7` → deploy
2. Vercel KV + env vars above
3. VNPay sandbox test transaction end-to-end
4. cron-job.org → `giu-reservation-expiry` every 60s
5. Onboard 5–20 real bakeries (Quận 1·3·7) via Zalo
