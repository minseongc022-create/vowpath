# Vowpath — HVAC After-Hours Landing

Production-ready marketing site for a US HVAC SaaS (Stripe / Linear style).

## Stack

- Next.js 15 (App Router)
- Tailwind CSS
- TypeScript

## Structure

```
app/                 # routes & layout
components/
  layout/            # Header, Footer
  sections/          # page sections
  ui/                # Button, Container, SectionHeading
lib/
  constants.ts       # site config
  content.ts         # all marketing copy
  utils.ts           # helpers
```

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Deploy

Push to GitHub → connect [Vercel](https://vercel.com).

## Edit copy

Update `lib/content.ts` only — sections read from there.

## Payments (self-serve)

1. Copy `.env.example` to `.env.local`
2. Add Stripe keys or Payment Link
3. `결제하고 시작하기` → Stripe → `/onboarding`

Jobber OAuth and phone provisioning are stubbed on `/onboarding` until product phase.
