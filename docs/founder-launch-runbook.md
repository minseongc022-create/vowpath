# Effiroad — Founder Launch Runbook

One-time master checklist. Do these in order. Each step has: what / where / command / done criteria.

**Legend:** 🖥️ = Vercel dashboard · 🟣 = Twilio console · 💳 = Lemon Squeezy dashboard · 💻 = terminal

---

## A. Vercel Environment Variables

**Where:** [vercel.com](https://vercel.com) → your project → Settings → Environment Variables

Set each variable for **Production** environment.

| # | Variable | Value format | Done? |
|---|----------|-------------|-------|
| A1 | `AUTH_SECRET` | 32+ random chars. Generate: `openssl rand -hex 32` | ☐ |
| A2 | `KV_REST_API_URL` | Auto-set when you attach Vercel KV (Storage tab) | ☐ |
| A3 | `KV_REST_API_TOKEN` | Auto-set with KV | ☐ |
| A4 | `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | ☐ |
| A5 | `TWILIO_AUTH_TOKEN` | From Twilio console (keep secret) | ☐ |
| A6 | `TWILIO_WEBHOOK_BASE_URL` | `https://effiroad.com` (no trailing slash) | ☐ |
| A7 | `OPENAI_API_KEY` | `sk-proj-...` | ☐ |
| A8 | `LEMON_SQUEEZY_API_KEY` | Lemon Squeezy → Settings → API | ☐ |
| A9 | `LEMON_SQUEEZY_STORE_ID` | Settings → Stores → Copy ID | ☐ |
| A10 | `LEMON_SQUEEZY_VARIANT_ID_*` | All plan variant IDs — see **[CHECKOUT_LAUNCH.md](./CHECKOUT_LAUNCH.md)** | ☐ |
| A11 | `LEMON_SQUEEZY_WEBHOOK_SECRET` | Webhooks → signing secret | ☐ |
| A12 | `RESEND_API_KEY` | `re_...` (password reset emails) | ☐ |
| A13 | `CRON_SECRET` | any random string ≥ 20 chars | ☐ |
| A14 | `NEXT_PUBLIC_BETA` | `false` | ☐ |
| A15 | `EMAIL_FROM` | `Effiroad <noreply@effiroad.com>` | ☐ |
| A16 | `GOOGLE_MAPS_API_KEY` | **Server** key (IP / unrestricted) for Places — not a browser-referrer-only key | ☐ |

**Do NOT set in production:**
- `ALLOW_TWILIO_OWNER_ALERT` — leave unset
- `ALLOW_TWILIO_DEFAULT_TENANT` — leave unset

After setting all variables → redeploy: Vercel → Deployments → Redeploy latest.

**Done criteria:** `npm run check:prod` → all ✓ · `GET /api/checkout/status` → `"mode":"ready"`

---

## B. Twilio Webhook Registration

**Order:** Set A6 (`TWILIO_WEBHOOK_BASE_URL`) first, then redeploy, then run B1.

| # | Action | Command / Where | Done? |
|---|--------|----------------|-------|
| B1 | Register webhooks | `npm run twilio:register` | ☐ |
| B2 | Verify webhooks | `npm run twilio:check` | ☐ |
| B3 | Confirm Voice URL in Twilio console | [console.twilio.com](https://console.twilio.com) → Phone Numbers → Active Numbers → click your number → Voice URL = `https://effiroad.com/api/twilio/voice` | ☐ |
| B4 | Confirm SMS URL | Same page → SMS URL = `https://effiroad.com/api/twilio/sms` | ☐ |
| B5 | Enable US geo permissions | Twilio console → Messaging → Settings → Geo Permissions → check United States → Save | ☐ |
| B6 | Add verified caller ID | Twilio console → Phone Numbers → Verified Caller IDs → Add → your mobile | ☐ |

**Done criteria:** `npm run twilio:check` shows both VOICE OK and SMS OK

---

## C. Lemon Squeezy Live Checkout

Full steps: **[CHECKOUT_LAUNCH.md](./CHECKOUT_LAUNCH.md)**

| # | Action | Where | Done? |
|---|--------|-------|-------|
| C1 | Complete store approval | [Lemon Squeezy](https://app.lemonsqueezy.com) | ☐ |
| C2 | Create subscription products + usage variants | Lite / Flex / Pro / Scale / Voice (+ usage/overage) | ☐ |
| C3 | Copy variant IDs to Vercel | Every `LEMON_SQUEEZY_VARIANT_ID_*` from CHECKOUT_LAUNCH.md | ☐ |
| C4 | Set API key + store id | `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID` | ☐ |
| C5 | Webhook | `https://effiroad.com/api/lemon-squeezy/webhook` → `LEMON_SQUEEZY_WEBHOOK_SECRET` | ☐ |
| C6 | Verify | `node scripts/verify-checkout-prod.mjs https://effiroad.com` → mode `ready` | ☐ |
| C7 | Test live checkout | `/pricing` → Subscribe → Lemon Squeezy checkout → settings success | ☐ |

**Done criteria:** `GET /api/checkout/status` returns `"mode":"ready"` and checkout redirects to Lemon Squeezy

---

## D. E2E Test Call

| # | Action | Command | Expected | Done? |
|---|--------|---------|----------|-------|
| D1 | Run smart booking E2E | `npm run e2e:smart-booking` | P1 water → crew SMS + owner FYI | ☐ |
| D2 | Run SMS flows E2E | `npm run e2e:sms-flows` | All 16 templates pass | ☐ |
| D3 | Run Twilio inbound E2E | `npm run e2e:twilio-inbound` | Inbound → SMS link → intake | ☐ |
| D4 | Live call — restoration scenario | Forward your mobile → call it → say "Basement flooding, burst pipe" | Auto-dispatch SMS received | ☐ |
| D5 | Live call — HVAC scenario | Call → say "No heat, furnace won't start" | Auto-dispatch SMS received | ☐ |
| D6 | Live call — safety hold scenario | Call → say "I smell gas near my furnace" | Hold SMS received (NOT auto-dispatch) | ☐ |
| D7 | Undo test | Reply `9` to owner FYI SMS within 30 min | Customer notified of cancellation | ☐ |

**Done criteria:** D1-D3 all pass, D4-D6 real SMS received, D6 shows HOLD not auto-dispatch

---

## E. Loom Demo Video

Record once, reuse forever in cold outreach.

| # | Action | Done? |
|---|--------|-------|
| E1 | Open effiroad.com dashboard | ☐ |
| E2 | Have a test booking visible | ☐ |
| E3 | Record using script in `docs/cold-outreach.md` (2-min script) | ☐ |
| E4 | Loom: Share → copy link → save to cold-outreach.md template | ☐ |

**Target:** < 2 min, shows: call → AI intake → owner SMS → crew SMS → dashboard

---

## F. Cold Launch Day 1

**Prerequisites:** All A–E complete, `npm run launch:check` → GO

| # | Action | Tool | Done? |
|---|--------|------|-------|
| F1 | Build target list: 20 email + 10 LinkedIn | Google Maps + IICRC directory | ☐ |
| F2 | Personalize Email 1 for each (shop name, city) | Gmail / Any email | ☐ |
| F3 | Send Email 1 to 20 targets | 8–10am local time | ☐ |
| F4 | Send LinkedIn connection request to 10 | Use DM 1 template from cold-outreach.md | ☐ |
| F5 | Set reminder: follow up in 3 days | Calendar | ☐ |
| F6 | Track: name / email / sent date / reply / status | Spreadsheet or Notion | ☐ |

**Reply handling:**

| Reply type | Your response |
|-----------|--------------|
| "Yes, interested" | "Great — I'll set everything up. Send me your shop name and owner mobile. Usually takes 15 min." |
| "How much?" | "Zero for 30 days. After that $199 flat or $49+$18/dispatch. Most shops recover that on the first job." |
| "Not interested" | "No problem — good luck with [season]. Feel free to reach out if anything changes." |
| No reply (3 days) | Send Email 2 |

---

## Quick Reference Commands

```bash
# Check all env vars
npm run check:prod

# Register Twilio webhooks
npm run twilio:register

# Verify webhooks are set correctly
npm run twilio:check

# Full launch readiness check
npm run launch:check

# E2E: water loss → dispatch
npm run e2e:smart-booking

# E2E: all SMS templates
npm run e2e:sms-flows
```

---

## Cost Summary

| Service | Monthly cost | Notes |
|---------|-------------|-------|
| Vercel | $0–20 | Pro plan if needed for KV |
| Vercel KV | $0 (256MB free) | Upgrade if > 5 shops |
| Twilio (per call) | ~$0.015/min voice + $0.0079/SMS | ~$2-5/shop/month at low volume |
| OpenAI (per call) | ~$0.01–0.05/call | gpt-4o-mini is cheap |
| Lemon Squeezy (MoR) | Platform fee per LS pricing | Only charged on paid customers |
| Resend | $0 (3,000 emails/mo free) | For OTP / password reset |
| **Pilot phase (0 customers)** | **< $30/month** | Only Twilio + OpenAI usage |
