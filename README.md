# Vowpath — HVAC After-Hours

US residential HVAC SaaS: missed-call recovery, smart auto-booking, owner SMS approval.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind
- Twilio (voice/SMS), OpenAI (intake extraction), Vercel KV, Stripe

## Develop

```bash
npm install
cp .env.example .env.local   # fill keys — see TWILIO_SETUP.md
npm run seed:dev-user
npm run dev
```

Open http://localhost:3000

## Test

```bash
npm run test          # unit tests (policy, guardrails)
npm run test:e2e      # full E2E: simulate-call, owner 1/2/9, 16 SMS templates, Twilio inbound
```

Set `SMS_DEV_PREVIEW=1` to log SMS bodies without sending. Set `OPENAI_API_KEY` for intake simulation.

## Build & deploy

```bash
npm run build
npm start
```

Push to GitHub → Vercel. After deploy:

```bash
npm run twilio:register
node scripts/check-production-readiness.mjs
```

See `LOCALE.md` for Stripe, KV, and beta flags.

## Product flows (tested in dev)

| Flow | How |
|------|-----|
| Inbound call → SMS link | `npm run e2e:twilio-inbound` |
| Phone speech intake | same + `intake_speech` step |
| P2 auto-book + customer SMS | `npm run e2e:smart-booking` |
| P1 owner approval 1/2 | same |
| Owner undo (9) | same |
| All SMS templates | `npm run e2e:sms-flows` |

Live Twilio SMS: `node scripts/sms-diagnose.mjs +1XXXXXXXXXX` (verified recipient on trial).

## Settings

- `/settings` — schedule, forwarding guides, Jobber OAuth, booking policy
- `/onboarding` redirects to `/settings`
