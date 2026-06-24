# Vowpath production deploy checklist

## 1. Git

```bash
git add -A
git commit -m "Your message"
git push origin main
```

Vercel deploys automatically on push to `main`.

## 2. Vercel env (Project → Settings → Environment Variables)

Required:

- `AUTH_SECRET`
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` (attach Vercel KV — auto-injects these)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_WEBHOOK_BASE_URL` = your prod domain (e.g. `https://vowpath.vercel.app`)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` + price IDs (if billing live)
- `RESEND_API_KEY` (email OTP)
- `PURGE_ACCOUNTS_SECRET` — separate random secret for `/api/admin/purge-accounts` (not `AUTH_SECRET`)

Production safety (leave **unset** or explicitly `false`):

- `ALLOW_TWILIO_OWNER_ALERT` — do **not** set `true` in production unless you intentionally route owner SMS via `TWILIO_OWNER_ALERT_PHONE`
- `ALLOW_TWILIO_DEFAULT_TENANT` — do **not** set `true` in production (shared-number fallback is dev-only)

## 3. Twilio webhooks

After deploy, from repo root:

```bash
npm run twilio:register
npm run twilio:check
```

Console:

1. **Verified Caller IDs** — add owner mobile (fixes error 21608 on Trial)
2. **Messaging → Geo permissions** — enable United States (fixes 21408)
3. Upgrade account when ready for non-verified customer numbers

## 4. Smoke test (production)

- `/dashboard` loads — **Collected revenue** from Jobber invoices (paid amounts)
- `/dashboard` — Call recovery shows booking counts (no $ estimates)
- `/dashboard/ai` — proactive briefing + rule preview
- `/dashboard/settings` — Automation Rules list
- `POST /api/vowpath-ai` with session cookie
- Place test call or use call simulation in settings

## 5. Jobber

If `JOBBER_REFRESH_FAILED`: Settings → Jobber → reconnect OAuth.

## 6. Local dev tunnel

```bash
npx localtunnel --port 3000
# set TWILIO_WEBHOOK_BASE_URL to tunnel URL, then npm run twilio:register
```
