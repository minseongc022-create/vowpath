# Effiroad — US Restoration AI Phone SaaS

AI phone + SMS intake, emergency triage, and crew dispatch for independent US water/fire/mold restoration shops.

## Stack

- Next.js 15 (App Router), TypeScript, Tailwind
- Twilio (voice/SMS), OpenAI (intake extraction + triage), Vercel KV, Stripe

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
npm run test:e2e      # full E2E: simulate-call, owner 1/2/9, SMS templates, Twilio inbound
```

Set `SMS_DEV_PREVIEW=1` to log SMS bodies without sending. Set `OPENAI_API_KEY` for intake simulation.

## Build & deploy

```bash
npm run build
npm start
```

Push to GitHub → Vercel auto-deploys. After deploy:

```bash
npm run twilio:register
npm run launch:check
```

See `DEPLOY.md` for full production checklist and `docs/founder-launch-runbook.md` for step-by-step.

## Product flows (tested in dev)

| Flow | How |
|------|-----|
| Inbound call → SMS link | `npm run e2e:twilio-inbound` |
| Phone speech intake | same + `intake_speech` step |
| P1 water auto-dispatch + crew SMS | `npm run e2e:smart-booking` |
| P1 fire/Cat-3 → owner hold 1/2 | same |
| Owner undo (9) | same |
| All SMS templates | `npm run e2e:sms-flows` |

Live Twilio SMS: `node scripts/sms-diagnose.mjs +1XXXXXXXXXX`

## Key dispatch logic

- **Clear P1 water** → crew auto-SMS + owner FYI (reply `9` to undo)
- **Fire / Cat-3 / commercial / ambiguous** → owner SMS hold (reply `1` approve / `2` pass)
- **P2/P3** → auto-confirm slot + customer SMS

## Settings

- `/dashboard/settings` — storm mode, on-call schedule, crew dispatch, booking policy, service area
- `/onboarding` redirects to `/settings`
