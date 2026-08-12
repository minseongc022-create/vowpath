# ClosePing

Standalone estimate follow-up SaaS. **Completely separate from Effiroad.**

- Own Next.js app (`closeping/`)
- Own auth, database files, SMS layer, design system
- No shared UI, routes, or branding with Effiroad

## Design

Monochrome chrome: black / silver / white, Syne + DM Sans, glass panels, metallic CTAs.

## Run locally

```bash
cd closeping
npm install
npm run dev
```

Open http://localhost:3010

## Deploy

Deploy the `closeping/` folder as its **own** Vercel project (Root Directory = `closeping`).

Do **not** serve ClosePing from the Effiroad app.

## Product

- Add quotes (or CSV import)
- Send branded SMS
- Auto-chase at 48h / 7d / 14d (`/api/cron/chase`)
- Mark won / lost
- Pricing: $149/mo · 14-day trial
