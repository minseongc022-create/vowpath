# Effiroad Production Checklist

Run this before cold outreach starts. Fill in pass/fail for each item.

---

## A. Environment Variables

Run: `npm run check:prod`

| Check | Status | Notes |
|-------|--------|-------|
| AUTH_SECRET (32+ chars) | ☐ pass / ☐ fail | |
| KV_REST_API_URL + TOKEN | ☐ pass / ☐ fail | Attach Vercel KV in dashboard |
| NEXT_PUBLIC_BETA=false | ☐ pass / ☐ fail | Paid launch — no free signup |
| PADDLE_API_KEY (pdl_live_) | ☐ pass / ☐ fail | |
| PADDLE_CLIENT_TOKEN | ☐ pass / ☐ fail | See docs/CHECKOUT_LAUNCH.md |
| PADDLE_PRICE_ID_* (all plans) | ☐ pass / ☐ fail | Flex/Lite/Pro/Scale/Voice + usage |
| PADDLE_WEBHOOK_SECRET | ☐ pass / ☐ fail | |
| GOOGLE_MAPS_API_KEY (server) | ☐ pass / ☐ fail | Not browser-referrer-only |
| TWILIO_ACCOUNT_SID + AUTH_TOKEN | ☐ pass / ☐ fail | |
| TWILIO_WEBHOOK_BASE_URL | ☐ pass / ☐ fail | Must be `https://effiroad.com` |
| OPENAI_API_KEY (sk-) | ☐ pass / ☐ fail | |
| CRON_SECRET | ☐ pass / ☐ fail | |
| cron-job.org → `/api/cron/tech-dispatch` every 60s | ☐ pass / ☐ fail | See **CRON.md** — not in vercel.json |

All pass → continue. Any fail → fix in Vercel dashboard before proceeding.

---

## B. Twilio Webhooks

Run: `npm run twilio:check`

| Check | Expected | Status |
|-------|----------|--------|
| Voice URL | `https://effiroad.com/api/twilio/voice` | ☐ OK / ☐ wrong |
| SMS URL | `https://effiroad.com/api/twilio/sms` | ☐ OK / ☐ wrong |

If wrong: `npm run twilio:register` then re-run `npm run twilio:check`

**Twilio Console manual checks** ([console.twilio.com](https://console.twilio.com)):

| Check | Location | Status |
|-------|----------|--------|
| US Geo permissions ON | Messaging → Settings → Geo Permissions → United States ✓ | ☐ done |
| Verified Caller ID (owner mobile) | Phone Numbers → Verified Caller IDs | ☐ done |
| Account is not Trial | Console top bar — no "Trial" badge | ☐ confirmed |

---

## C. Vertical & Dispatch Policy Check

| Check | Status |
|-------|--------|
| `/onboarding` shows vertical picker before schedule step | ☐ pass |
| Selecting HVAC sets `vertical=hvac` in shop profile | ☐ pass |
| `/hvac` landing page loads | ☐ pass |
| `/restoration` redirects to `/` | ☐ pass |
| `npm test` — all vertical tests pass | ☐ pass |

Run unit tests:
```bash
npm test
```

Expected: shop-vertical, home-services-dispatch, data-truthfulness, auto-book-gate, auto-book-policy all pass.

---

## D. E2E Test Call — Water Loss → Auto Dispatch (restoration regression)

Run in order:

### Step 1 (Restoration): Simulate P1 water call

```bash
npm run e2e:smart-booking
```

**Expected output:**
```
[simulate-call] scenario: p1_water_burst_pipe
[ai-triage] priority: P1, lossCategory: water
[dispatch] clear_p1_water_auto_dispatch → crew SMS sent
[owner-fyi] sent to owner phone
```

| Expected event | Received? |
|---------------|-----------|
| AI triage → P1 water | ☐ yes / ☐ no |
| Crew auto-dispatch SMS | ☐ yes / ☐ no |
| Owner FYI SMS | ☐ yes / ☐ no |
| Job appears in dashboard | ☐ yes / ☐ no |

### Step 2 (Restoration): Simulate Fire/Cat-3 hold

Expected: owner gets `1=approve, 2=pass` SMS (NOT auto-dispatch)

| Expected event | Received? |
|---------------|-----------|
| Owner hold SMS (1/2) | ☐ yes / ☐ no |
| No crew auto-dispatch | ☐ confirmed |

### Step 3 (old — replaced by above)

Run: `npm run e2e:sms-flows`

Expected: undo within 30-min window cancels dispatch + customer notified.

### Step 3 (HVAC vertical): Simulate no-heat auto-dispatch

For an HVAC shop: set vertical to HVAC in settings, then run test call with "no heat" scenario.
Expected: auto-dispatch (not held). Gas smell scenario: expected hold.

### Step 4: Owner undo (reply 9)

Run: `npm run e2e:sms-flows`

Expected: undo within 30-min window cancels dispatch + customer notified.

### Step 5: Live forward test (optional but recommended)

1. Forward your personal number to your Effiroad Twilio number
2. Call from a third phone
3. Complete intake: "basement flooding from burst pipe, 123 Test St"
4. Check: owner SMS received, dashboard job created
5. Reply `9` to cancel test job

---

## D. Dashboard & UI Checks

| URL | Check | Status |
|-----|-------|--------|
| `/dashboard` | Loads, shows bookings list | ☐ pass |
| `/dashboard/settings` | Storm mode toggle saves | ☐ pass |
| `/dashboard/settings` | Crew dispatch: add tech, set on-call, save | ☐ pass |
| `/dashboard/settings` | Service area ZIPs save | ☐ pass |
| `/dashboard/ai` | Briefing loads, no error | ☐ pass |
| `/dashboard/bookings` | Booking list, can open job detail | ☐ pass |
| `/signup` | Signup flow works (if NEXT_PUBLIC_BETA=true for testing) | ☐ pass |
| `/intake/[token]` | Intake form loads with insurance fields visible | ☐ pass |

---

## E. Paddle Live Check

1. Follow **docs/CHECKOUT_LAUNCH.md** — enable Paddle Checkout + set price IDs
2. Confirm products exist: Unlimited ($199) + Flex ($49) + Flex usage ($18)
3. Do a test checkout with a real card (Stripe lets you refund immediately):
   - `/pricing` → click Unlimited → complete checkout
   - Verify webhook fires: check Vercel logs for `stripe/webhook` 200
   - Refund in Stripe Dashboard → Payments → find charge → Refund

| Check | Status |
|-------|--------|
| Live Stripe keys in Vercel | ☐ done |
| Test purchase + refund | ☐ done |
| Webhook fires (200 in Vercel logs) | ☐ done |

---

## Failure Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Crew SMS never arrives | Twilio geo US not enabled | Console → Messaging → Geo Permissions |
| "Invalid signature" in Vercel logs | Webhook URL mismatch | Re-run `npm run twilio:register` |
| Owner SMS not arriving | Owner phone not set in Settings | Dashboard → Settings → Contact |
| AI triage returns "other" | Transcript too short | Speak longer in test call |
| Dashboard shows no jobs | Shadow mode > 0 | Settings → Shadow mode → set to 0 |
| Stripe webhook 400 | Wrong webhook secret | Vercel env → `STRIPE_WEBHOOK_SECRET` |

---

## Sign-off

```
Date: ____________
Checked by: ____________

[ ] All A checks pass (npm run check:prod)
[ ] All B checks pass (npm run twilio:check + console)
[ ] C E2E: water auto-dispatch confirmed
[ ] C E2E: fire hold confirmed
[ ] D dashboard UI all pass
[ ] E Stripe live test done

VERDICT: GO / NO-GO
```
