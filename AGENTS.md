# Agent notes (Effiroad)

Instructions for AI coding assistants working in this repo.

## Read first

| Topic | File |
|-------|------|
| **Cron, polling, “how often does X run?”** | **[CRON.md](./CRON.md)** ← always read before answering |
| Deploy & env | [DEPLOY.md](./DEPLOY.md) |
| Twilio | [TWILIO_SETUP.md](./TWILIO_SETUP.md) |
| Retell AI | [docs/RETELL_SETUP.md](./docs/RETELL_SETUP.md) |

## Cron — common mistake

**Do not** tell users that tech dispatch runs once per day because `vercel.json` says `0 8 * * *`.

**Production:** cron-job.org calls `/api/cron/tech-dispatch` **every 60 seconds**. That is intentional (Vercel Hobby cannot run sub-daily crons in `vercel.json` without breaking deploys).

Machine-readable schedule: `config/cron.schedule.json`

Validate before changing crons: `npm run check:cron`

## Stack

Next.js 15 App Router, TypeScript, Tailwind, Twilio, Vercel KV, Paddle billing.

## Branches

Cloud agent branches: `cursor/<descriptive-name>-531b`
