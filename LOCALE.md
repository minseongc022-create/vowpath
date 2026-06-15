# Locale

- **Current:** Korean (KO)
- **CTA model:** Self-serve — pay → onboarding (no demo-first)
- **Contact / support:** support@vowpathhq.com

## Stripe setup

1. Copy `.env.example` → `.env.local`
2. Create $199/mo subscription Price in Stripe
3. Set `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` OR `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`

After payment, user lands on `/onboarding`.

## Not built yet (post-landing product)

- Jobber OAuth (real connect button)
- Twilio number + call forwarding automation
- Webhook: `checkout.session.completed` → provision tenant
