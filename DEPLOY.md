# Vowpath production deploy checklist

## 1. Git

```bash
git add -A
git commit -m "Ship AI Admin, Workflow Builder, and ops hardening"
git push origin main
```

## 2. Vercel

```bash
vercel login
npx vercel --prod
```

Required env on Vercel (Project → Settings → Environment Variables):

- `AUTH_SECRET`
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or Upstash equivalents)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_WEBHOOK_BASE_URL` = `https://vowpathhq.com` (or your prod domain)
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` + price IDs (if billing live)
- `RESEND_API_KEY` (email OTP)
- `ALLOW_TWILIO_OWNER_ALERT=true` (owner SMS reply routing)

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

- `/dashboard` loads
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
