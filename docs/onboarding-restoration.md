# Effiroad — Restoration shop onboarding (~10 minutes)

Use this checklist when a new shop signs up or starts a 30-day pilot.

## Before the call

- [ ] Shop has a US mobile for owner alerts (SMS 1 / 2 / FYI)
- [ ] At least one crew phone in **Settings → Crew assignment**
- [ ] Optional: Jobber connected if they use it

## Step 1 — Account (2 min)

1. Go to [effiroad.com/get-started](https://effiroad.com/get-started) and create an account.
2. **Settings → Contact** — shop name, owner phone, timezone.
3. **Settings → Hours** — when Effiroad answers vs your team (after-hours forward is typical).
4. Set **Practice calls left** to `0` when ready for live dispatch (shadow mode off).

## Step 2 — Crew & on-call (2 min)

1. **Settings → Crew assignment** — add each tech name + mobile.
2. Enable **Crew text assignment**.
3. **On-call rotation** — pick primary crew per weekday (or leave round-robin).
4. **Save all settings**.

## Step 3 — Forward your main line (3 min)

1. **Settings → Forwarding** — copy your Effiroad number and carrier forward codes.
2. On the shop’s **main Google / truck number**, set:
   - **No answer** → forward to Effiroad
   - **Busy** → forward to Effiroad (optional but recommended)
3. Keep the same public number — customers never see a new number.

## Step 4 — Storm mode (optional)

During hurricane / heavy rain weeks:

- **Settings → Booking & schedule → Storm surge mode** → ON  
- Shorter voice prompts + queue reassurance on inbound calls.

Turn OFF when call volume is normal.

## Step 5 — Test call (3 min)

### Option A — Call simulation (no carrier forward needed)

1. **Settings → Call simulation** — run a test with scenario: *“Basement flooding from burst pipe”*.
2. Confirm:
   - Owner gets FYI or 1/2 SMS (depending on loss type)
   - Crew gets dispatch text (clear P1 water with full address)
   - Job appears on **Dashboard**

### Option B — Live forward test

1. Call the shop’s public number from a mobile **without** answering on site.
2. Press **1** for SMS link OR **2** for phone intake.
3. Complete intake with a test address.
4. Reply **9** within undo window if you need to cancel auto-dispatch.

## Step 6 — Go live

- [ ] `Practice calls left` = 0
- [ ] Forwarding verified with one real no-answer call
- [ ] Owner phone receives test SMS
- [ ] Crew phone receives test dispatch (or on-call person)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No SMS to owner/crew | Check owner phone in Contact; Twilio geo US enabled |
| Call doesn’t reach Effiroad | Re-check carrier forward; confirm forward target number |
| Auto-dispatch didn’t fire | Fire/Cat-3/ambiguous → owner 1/2 by design; check loss description |
| Jobber not syncing | Approve booking first; reconnect Jobber OAuth in Settings |

## Support

- Email: support@effiroad.com
- Dispatch packet: **Dashboard → job → Export dispatch packet** (copy for DASH/Encircle)
