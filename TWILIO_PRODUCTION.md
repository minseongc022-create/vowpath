# Twilio production setup (paid + phone test)

## 1. Upgrade Twilio account

1. [Twilio Console](https://console.twilio.com) → **Billing** → add payment method
2. Upgrade from Trial → **Pay-as-you-go**
3. Note your **Account SID** and **Auth Token** (same as trial)

Trial limits removed after upgrade:
- SMS/calls to non-verified numbers
- Broader outbound calling

## 2. Verified Caller ID (still recommended)

Even on paid, register owner phone for reliable SMS **from** your number:

1. Console → **Phone Numbers** → **Verified Caller IDs**
2. Add `+821055969438` (or your US owner mobile)
3. Complete SMS verification

## 3. Geo permissions

1. Console → **Messaging** → **Geo permissions**
2. Enable **United States** (and **South Korea** if testing KR SMS)

## 4. Vercel environment

Set in Vercel → Project → Environment Variables (Production):

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WEBHOOK_BASE_URL=https://effiroad.com
ALLOW_TWILIO_OWNER_ALERT=true
```

Optional (auto-buy numbers per shop — **costs ~$1/mo per number**):

```
TWILIO_AUTO_PROVISION=true
```

Set `TWILIO_AUTO_PROVISION=false` if you use one shared dev number.

## 5. Register webhooks (after deploy)

```bash
cd "path/to/vowpath"
npm run twilio:register
npm run twilio:check
```

## 6. Phone test checklist

| Test | How |
|------|-----|
| Inbound voice | Call your Twilio shop number (or forward real line) |
| Intake SMS | Complete a booking; check customer SMS |
| Owner approval SMS | Hybrid rule → pending → owner gets SMS |
| Owner reply YES | `ALLOW_TWILIO_OWNER_ALERT=true` + verified owner phone |
| Simulation | Settings → 통화 시뮬레이션 (no Twilio cost) |

## 7. Cost watch (Twilio)

- **Phone number**: ~$1.15/mo per US local number
- **Inbound voice**: per minute
- **SMS**: per segment (US ~$0.0079 outbound)
- Monitor: Console → **Monitor** → **Usage**

Vowpath does **not** auto-upgrade Twilio or charge your card for Twilio — that is separate from Stripe subscription.
