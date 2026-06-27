# Effiroad Pre-Sales QA Checklist

Run this checklist on effiroad.com before your first cold outreach.
Every item should pass before you send a single email.

---

## Landing Page

| URL / Element | Check | Pass? |
|---------------|-------|-------|
| `https://effiroad.com` | Loads in < 3s | ☐ |
| Hero headline | "Never lose a $10,000 job at 2 AM again" (or current) | ☐ |
| Logo | Visible, not broken/blurry | ☐ |
| "Get started" CTA | Clicks through to `/get-started` or `/signup` | ☐ |
| `/#how-it-works` | Section loads, no broken cards | ☐ |
| `/#pricing` | Shows $199 Unlimited + $49 Flex prices | ☐ |
| Footer links | Privacy, Terms load without 404 | ☐ |
| Mobile view | Site is readable on phone | ☐ |

---

## Signup Flow

| Step | Expected | Pass? |
|------|----------|-------|
| `/get-started` or `/signup` | Form loads | ☐ |
| Sign up with test email | OTP code arrives in email | ☐ |
| OTP enter | Redirects to `/dashboard` or `/onboarding` | ☐ |
| `/dashboard` loads | No error, shows empty state | ☐ |

If signup is blocked (`NEXT_PUBLIC_BETA=false`): confirm the Stripe payment link is live before sending outreach.

---

## Settings

| Setting | Check | Pass? |
|---------|-------|-------|
| Settings → Contact | Shop name + owner phone saves | ☐ |
| Settings → Booking | Storm mode toggle saves (ON then OFF) | ☐ |
| Settings → Crew Dispatch | Add a tech, assign weekday, save | ☐ |
| Settings → Crew Dispatch | On-call weekday picker shows all 7 days | ☐ |
| Settings → Service area | ZIP codes save | ☐ |

---

## Intake Portal (Customer-facing)

To test: Settings → generate a test intake link OR use a link from a simulated call.

| Field | Check | Pass? |
|-------|-------|-------|
| Name field | Visible, required | ☐ |
| Address field | Visible, Google autocomplete works | ☐ |
| Issue description | Visible, required | ☐ |
| Insurance section | "Insurance company" + "Claim number" + "Water source" visible | ☐ |
| "Damage is still spreading" checkbox | Visible | ☐ |
| Photo upload | Works on mobile | ☐ |
| Urgency selector | 3 options visible | ☐ |
| SMS consent | Required checkbox | ☐ |
| Submit | No errors for valid data | ☐ |

---

## Twilio / API Routes

| Endpoint | Expected response | Pass? |
|----------|------------------|-------|
| `GET /api/twilio/voice` | Returns TwiML XML (200) | ☐ |
| `POST /api/twilio/sms` (with test body) | 200 or 204 | ☐ |
| `GET /api/me` (logged in) | Returns user JSON | ☐ |
| `GET /api/shop/settings` | Returns settings JSON | ☐ |

Test voice endpoint in browser: `https://effiroad.com/api/twilio/voice` — should return XML starting with `<?xml`.

---

## Stripe / Billing

| Check | Pass? |
|-------|-------|
| `NEXT_PUBLIC_BETA=false` in Vercel env | ☐ |
| `/pricing` → Unlimited button → goes to Stripe checkout | ☐ |
| Stripe checkout is in LIVE mode (not test) | ☐ |

---

## Final Checklist Before First Email

```
[ ] Landing page loads clean, no broken elements
[ ] Signup flow works (or Stripe payment link is live)
[ ] Settings: storm mode + crew dispatch + on-call all save
[ ] Intake form: insurance fields visible
[ ] Twilio voice endpoint returns TwiML
[ ] npm run launch:check → all green
[ ] Loom demo video recorded and URL ready

SIGNED OFF: _____________ DATE: _____________
```
