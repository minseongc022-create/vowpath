# Effiroad HVAC Onboarding — 10-Minute Setup

**Time required:** ~10 minutes  
**What you need:** Your HVAC business phone number, access to your carrier (AT&T, Verizon, etc.) or VoIP settings

---

## Step 0 — Sign up

1. Go to [effiroad.com/hvac](https://effiroad.com/hvac) → "Start free trial"
2. Select **HVAC** as your shop type (sets HVAC dispatch rules automatically)
3. Enter your email, shop name, and set a password

---

## Step 1 — Set your answer hours

Set when Effiroad should answer on overflow:
- **Recommended:** Always on (24/7) — Effiroad only gets calls your phone doesn't answer
- Or set specific hours: e.g. 6 PM – 8 AM + weekends

> Your daytime calls still ring you directly. Effiroad only answers when your line is busy or unanswered.

---

## Step 2 — Forward overflow calls to Effiroad

**AT&T (most common for small shops):**
```
Dial: *72 + your Effiroad number → press Call
To cancel: *73
```

**Verizon:**
```
Settings → Call Forwarding → Forward when busy + Forward when unanswered
```

**Google Voice / VoIP:** Settings → "Forward unanswered calls"

Your Effiroad number is shown in Settings → Phone Setup.

---

## Step 3 — Configure your dispatch policy

Go to Settings → Booking & Dispatch:

| Setting | Recommended for HVAC |
|---------|---------------------|
| No-heat auto-dispatch | Enabled |
| Gas smell hold | Always on (cannot disable) |
| Owner approval SMS | "P1 only" (no-heat gets FYI, gas gets hold) |
| Shadow mode | Leave at 14 days for practice |

---

## Step 4 — Test call (required before going live)

1. Forward your phone to Effiroad
2. Call your own number from another phone
3. Say: "Hi, my furnace stopped working, I have no heat"
4. Verify:
   - AI answers within 2 rings
   - You receive an owner SMS within 30 seconds
   - Dashboard shows the test booking

5. Call again and say: "I smell gas near my furnace"
6. Verify:
   - Call is flagged as HOLD
   - You receive an urgent SMS — do NOT see auto-dispatch

---

## Step 5 — (Optional) Connect Jobber

Go to Settings → Integrations → Connect Jobber  
This enables:
- Automatic job creation on confirmed dispatches
- Collected revenue tracking in dashboard
- Jobber calendar slot offers to customers

> Effiroad works fully without Jobber — this is optional.

---

## HVAC Dispatch Rules (what Effiroad will do)

| Caller says | Effiroad action |
|-------------|----------------|
| "No heat" / "Furnace won't start" | Auto-dispatch on-call tech + FYI SMS to owner |
| "AC not cooling" / "No cool" | Auto-dispatch on-call tech + FYI SMS |
| "I smell gas" / "Gas leak" | **HOLD** — urgent SMS to owner: reply 1 to dispatch, 2 to hold |
| "Sparking outlet near HVAC" | **HOLD** — urgent SMS |
| Low confidence / bad address | **HOLD** — never dispatch blind |
| Tune-up / maintenance | Auto-confirm + customer picks slot |

---

## Troubleshooting

**No SMS received after test call:**
- Check Settings → Messaging → Owner phone number is correct
- Verify Twilio is configured (Settings → Phone Setup)

**Call not answered by AI:**
- Confirm forwarding is active (call your number from another phone — it should reach Effiroad)
- Check Settings → Schedule → Answer hours

**Gas smell not being held:**
- This should never happen — gas/sparking are hardcoded safety holds
- If you see auto-dispatch on gas smell: contact support immediately

---

## Quick reference

- Dashboard: [effiroad.com/dashboard](https://effiroad.com/dashboard)
- Settings: [effiroad.com/dashboard/settings](https://effiroad.com/dashboard/settings)
- Support: minseongc022@gmail.com
