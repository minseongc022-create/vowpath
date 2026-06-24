# Locale

- **Marketing UI:** English default (`NEXT_PUBLIC_LOCALE=en`)
- **Dashboard:** English + Korean toggle (cookie / localStorage)
- **Target market:** US residential HVAC owner-operators
- **Contact:** support@effiroad.com

## Stripe setup

1. Copy `.env.example` → `.env.local`
2. Create subscription prices in Stripe (Unlimited + Flex base + Flex usage)
3. Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_UNLIMITED`, `STRIPE_PRICE_ID_FLEX`, `STRIPE_PRICE_ID_FLEX_USAGE`

After payment, Stripe webhook updates billing on the matching account email. New signups use `/signup` (beta) or checkout → account creation.

## Local testing

```bash
npm run seed:dev-user   # ensures data/users.json dev tenant
npm run dev
npm run test          # unit tests
npm run test:e2e      # full booking + SMS + Twilio inbound smoke
```

Set `SMS_DEV_PREVIEW=1` to log SMS bodies without sending. Set `TWILIO_DEFAULT_USER_ID` to your dev tenant id.

## Production checklist

- Attach Vercel KV (required for multi-tenant state)
- `NEXT_PUBLIC_BETA=false` + Stripe keys
- `npm run twilio:register` after deploy
- Verified caller IDs + US Geo permissions on Twilio
