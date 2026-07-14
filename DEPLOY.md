# Effiroad — Production Deploy Checklist

Full step-by-step: `docs/founder-launch-runbook.md`

## 1. Git

```bash
git add -A
git commit -m "Your message"
git push origin main
```

Vercel deploys automatically on push to `main`.

## 2. Vercel env (Project → Settings → Environment Variables)

Required:

| Variable | Value |
|----------|-------|
| `AUTH_SECRET` | 32+ random chars (`openssl rand -hex 32`) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Attach Vercel KV — auto-injects |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | from Twilio console |
| `TWILIO_WEBHOOK_BASE_URL` | `https://effiroad.com` |
| `OPENAI_API_KEY` | `sk-...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (use `sk_test_` for staging) |
| `STRIPE_PRICE_ID_UNLIMITED` | `price_...` ($199/mo) |
| `STRIPE_PRICE_ID_FLEX` | `price_...` ($49/mo base) |
| `STRIPE_PRICE_ID_FLEX_USAGE` | `price_...` ($18/dispatch) |
| `RESEND_API_KEY` | `re_...` (password reset email) |
| `CRON_SECRET` | random string (protects /api/cron/*) |
| `NEXT_PUBLIC_BETA` | `false` |

## 2b. Cron (read CRON.md)

- **Tech dispatch (60s):** configure [cron-job.org](https://cron-job.org) → `GET https://effiroad.com/api/cron/tech-dispatch` every 1 minute with `Authorization: Bearer $CRON_SECRET`.
- **Do not** add `* * * * *` to `vercel.json` on Hobby — deploys fail. Run `npm run check:cron` before push.
- Full schedule: **[CRON.md](./CRON.md)** and `config/cron.schedule.json`.

## 2c. SEO & domains (Google brand search)

After deploy, in **Vercel → Project → Settings → Domains**:

1. **`www.effiroad.com`** → Redirect to `effiroad.com` (code also 308s via `vercel.json` + middleware)
2. **`vowroad.com`** (+ `www.vowroad.com` if owned) → Add to this project → Redirect to `effiroad.com`  
   Until the domain is attached, Google may still show old `vowroad.com` results (404).

Or with API token: `VERCEL_TOKEN=... VERCEL_PROJECT_ID=... npm run vercel:domains`

**vowroad.com still 404?** DNS is on Porkbun — either attach domain in Vercel (above) **or** URL-forward via Porkbun API:

```bash
PORKBUN_API_KEY=... PORKBUN_SECRET_KEY=... npm run porkbun:forward
```

Add those keys to **GitHub repo secrets** → push to `main` runs `.github/workflows/seo-deploy.yml` automatically.

**Search indexing:** `npm run seo:indexnow` (IndexNow → Bing/Yandex). Google sitemap ping is deprecated — use Search Console once.


Leave **unset** in production:

- `ALLOW_TWILIO_OWNER_ALERT` — dev only
- `ALLOW_TWILIO_DEFAULT_TENANT` — dev only

## 3. Twilio webhook registration

After each deploy (or domain change):

```bash
# Registers voice + SMS webhooks to effiroad.com
npm run twilio:register

# Verify they're correct
npm run twilio:check
```

Then in Twilio Console ([console.twilio.com](https://console.twilio.com)):

1. **Phone Numbers → Manage → Active Numbers** → confirm Voice URL = `https://effiroad.com/api/twilio/voice`
2. **Messaging → Settings → Geo Permissions** → enable **United States**
3. **Verified Caller IDs** → add your mobile (required if account has any trial restrictions)

## 4. Run readiness check

```bash
npm run launch:check
```

Expected: all checks ✓, verdict: **GO**

## 5. Smoke test (production)

- `/dashboard` loads — bookings list, analytics visible
- `/dashboard/settings` → storm mode toggle saves
- `/dashboard/settings` → crew dispatch: add a tech, assign on-call weekdays, save
- `/dashboard/ai` → proactive briefing loads
- Place test call or use Settings → "Simulate a call"
- Confirm owner SMS arrives, reply `1` to approve

## 6. E2E test script

```bash
# Simulates: water loss → P1 → auto dispatch → crew SMS + owner FYI
npm run e2e:smart-booking
```

Expected logs: `DISPATCH_SENT`, `OWNER_FYI_SENT`

## 7. Jobber (optional)

Settings → Integrations → Connect Jobber. If `JOBBER_REFRESH_FAILED`: reconnect OAuth.

## 8. Local dev tunnel (for Twilio testing locally)

```bash
npm run tunnel
# set TWILIO_WEBHOOK_BASE_URL to the tunnel URL, then:
npm run twilio:register
```
