# Effiroad Cold Outreach Playbook

**Target:** Independent US water/fire/mold restoration shops, 1–10 crew, no CRM
**Pilot offer:** 3-week co-build pilot (free), feedback shapes product + app roadmap
**Channels:** Cold email + LinkedIn DM
**Cadence:** 20–30 touches/week × 8 weeks = 160–240 total

> **Copy source of truth:** `lib/outreach/partnership-pilot-copy.ts` — import `partnershipPilotCopy` for SMS, email subject/body, follow-up, and Korean founder reference.

---

## Final outreach (send this)

**Voice:** operator-to-operator. Outcome-first. No begging, no internal details.

**Personalize:** `[First name]` · `[Shop name]` · `[City]` · `[State]` · optional review/detail line

**Subject:** `[Shop name] — after-hours dispatch`

**Replies:** `VIDEO` → 2-min Loom · `TRY` → setup this week · `PASS` → opt out

Templates: `lib/outreach/partnership-pilot-copy.ts` → `partnershipPilotCopy`, `outreachQuickSend`

**Before send:** read `sendChecklist` in that file (never mention internal cohorts, slot counts, or roadmap).

---

## ICP (Ideal Customer Profile)

| Attribute | Target |
|-----------|--------|
| Size | 1–10 crew |
| Speciality | Water damage primary (fire/mold secondary OK) |
| Location | FL, TX, LA, GA, NC (disaster-prone, high independent shop density) |
| Tech stack | No CRM or basic spreadsheet; voicemail for after-hours |
| Signal | Google reviews mention "called but no one answered" OR 3-star review on response time |
| Decision maker | Owner/operator (not office manager) |

**Avoid:** Servpro/Paul Davis franchisees, shops with full-time receptionist, shops already on DASH with AI features.

---

## Finding Targets

### Method 1 — Google Maps (fastest)
```
Search: "water damage restoration [city] [state]"
Filter: 3–4 stars, 10–100 reviews
Open each → check: owner name (Google Business), phone number, website
```

### Method 2 — IICRC Firm Directory
- iicrc.org → Find a Certified Firm
- Filter by state + Water Damage Remediation
- Download list → cross-reference with Google for owner names

### Method 3 — LinkedIn
```
Search: "water damage" OR "restoration" + "owner" OR "founder"
Location: Texas / Florida / Georgia / Louisiana / North Carolina
Filter: 1–10 employee company
```

### Method 4 — Google Reviews triage
Search: `"called" OR "no answer" OR "voicemail" site:google.com "[city] water damage"`

---

## Cold Email Templates

### Email 1 — Pain lead (send Monday or Tuesday, 8–10am local)

**Subject:** `[Shop name] — quick question about after-hours calls`

```
Hi [First name],

Quick question: when a homeowner calls [Shop name] at 2am with a burst pipe,
what happens if no one picks up?

Most independent shops lose 1–3 emergency jobs a week to voicemail.
Effiroad answers those calls with AI, captures the loss details, and texts
your on-call crew — so the job is locked in before they call Servpro.

No CRM needed. Keeps your same Google number.

Would a 30-day free trial make sense? I'll handle the setup myself.

— Min
effiroad.com
```

---

### Email 2 — Proof lead (send if no reply after 3 days)

**Subject:** `How [similar shop type] stopped losing 2AM jobs`

```
Hi [First name],

Following up — sharing what Effiroad does in 90 seconds:
[Loom link]

The short version: when a water loss call comes in after hours,
Effiroad answers, runs through loss triage (type, address, insurance),
and either auto-dispatches your crew or holds for your 1/2 approval —
all before the caller hangs up.

Clear water → crew gets auto-SMS. Fire/Cat-3 → you get a hold text.
Reply 9 to undo within 30 minutes.

30-day free. I set it up. You test it.

— Min
```

---

### Email 3 — Follow-up (send 5 days after Email 2)

**Subject:** `Last note — [Shop name]`

```
Hi [First name],

Last note — didn't want to keep bugging you.

If after-hours call handling is already solved, totally understand.

If it's still on the to-do list and you want a zero-risk trial,
reply "try it" and I'll get you set up this week — no charge for 30 days.

— Min
```

---

## LinkedIn DM Templates

### DM 1 — Connection request note

```
Hi [Name] — noticed you run [Shop] in [City].
I built an AI phone system specifically for restoration shops
(after-hours intake, P1 dispatch). Would love to connect — no pitch, just a quick chat.
```

### DM 2 — After connecting (send 2 days later)

```
Thanks for connecting, [Name].

Quick one: how do you handle emergency calls that come in when your
crew is already on a job or it's 2am?

I ask because I built Effiroad for exactly that —
AI answers, captures the loss, dispatches your on-call crew.
30-day free trial, I do the setup.

Would a short Loom demo be worth 2 minutes?
```

---

## Loom Demo Script (2 min)

**Title:** "Effiroad — 2am water loss to crew dispatch in 90 seconds"

**Setup before recording:**
- Open effiroad.com dashboard
- Have a test job ready in Dashboard → Bookings
- Have Settings → Crew Dispatch open with a test tech

**Script:**

```
[0:00–0:15] Hook
"It's 2am. A homeowner calls your shop — burst pipe, basement flooding.
No one picks up. Here's what Effiroad does instead of voicemail."

[0:15–0:45] Phone intake demo
"The call hits Effiroad. The AI greets them as [Shop Name].
Caller says: basement flooding, burst pipe.
AI captures: name, address, loss type, insurance carrier.
This takes about 60 seconds."

[0:45–1:10] Owner SMS
"You get this text: P1 water — [address] — crew auto-dispatched.
Reply 9 within 30 minutes to cancel. Otherwise crew goes."

[1:10–1:35] Crew SMS
"Your on-call tech gets: New water job at [address], arrival window 2–4am.
Reply 1 to accept, 2 to pass."

[1:35–2:00] Dashboard
"Everything lands here — loss type, insurance, photo, dispatch log.
No CRM needed. Export for DASH or Encircle if you use them."

[2:00] CTA
"30-day free trial. I handle setup. Just reply to this email."
```

---

## Weekly Outreach Plan (8 weeks)

| Week | Email sends | LinkedIn DMs | Goal |
|------|-------------|--------------|------|
| 1 | 30 (Email 1) | 20 connections | List built, Email 1 out |
| 2 | 20 (Email 2 to non-opens) + 10 new Email 1 | 10 DM 2s | First replies |
| 3 | 20 (Email 3 to non-replies) + 20 new | 10 new | 1–2 trial starts |
| 4–8 | 30/week new targets | 15/week | 3–5 pilots running |

**Total:** ~200 email touches, ~100 LinkedIn touches over 8 weeks

---

## Pilot Offer

**What:** 30-day free trial (you waive the $199 fee)

**What you get in exchange:**
- Permission to use them as a case study ("unnamed restoration company, [city]")
- Testimonial quote (email is fine, no video required)
- Real data: calls handled, jobs locked in, response time

**How to frame it:**
```
"I'm running a 30-day pilot for 5 shops — free, I do the setup,
you just forward your after-hours calls and see what happens.
Only ask: if it works, a quick quote I can share anonymously."
```

---

---

## HVAC Vertical — Outreach Templates

### HVAC Email 1

**Subject:** When your tech is on a job and the furnace call goes to voicemail

Hi [First Name],

HVAC shop owners miss no-heat calls for one reason: they're already working.

Effiroad answers after-hours and overflow calls automatically — classifies the job (no-heat, AC, gas smell, maintenance), and dispatches your on-call tech in under 90 seconds for emergencies.

Gas smell? Never auto-dispatched — it texts you first and waits.

30-day free trial, I do the setup, takes 10 minutes.

[Your name]

---

### HVAC Email 2 (follow-up, Day 5)

**Subject:** Re: HVAC after-hours calls

Quick follow-up — one thing that sets this apart from generic answering services:

Effiroad knows the difference between "no heat" (auto-dispatch) and "gas smell" (hold, text you). Regular answering services don't make that call.

Worth 15 minutes to show you a live demo?

[Your name]

---

### HVAC LinkedIn DM 1

Hi [Name] — I work with HVAC shops on after-hours call handling. No-heat calls in January are $1,500+ jobs. Missing one because you're on another job costs more than the fix. Built something that auto-dispatches those while holding gas-smell calls for your approval. Happy to show you a 2-minute demo.

---

### HVAC Loom Demo Script (2 min)

```
[0:00–0:15] Hook
"It's January, 11pm. Homeowner calls — no heat, furnace won't start.
You're on another job. Here's what Effiroad does instead of voicemail."

[0:15–0:45] Phone intake demo
"The call hits Effiroad. AI greets them as [Shop Name].
Caller: no heat, furnace won't start, address confirmed.
This takes about 45 seconds."

[0:45–1:10] Auto-dispatch
"No hold needed — this is a clear P1 no-heat with a verified address.
Your on-call tech gets an SMS: New HVAC job, no heat, [address].
Reply 1 to accept."

[1:10–1:35] Gas smell demo
"Now watch what happens when someone says gas smell.
No auto-dispatch — you get an urgent SMS: hold for your approval.
Reply 1 to send, 2 to hold. Always your call."

[1:35–2:00] Dashboard + CTA
"Everything logs here — issue type, address, dispatch log.
30-day free trial. I do the setup. Just reply."
```

---

## Objection Responses

| Objection | Response |
|-----------|----------|
| "We already have an answering service" | "Answering services take a message. Effiroad captures loss type, address, insurance, and dispatches crew — no message tag." |
| "We're too small" | "Perfect fit — 1–5 crew shops are exactly who this is built for. No setup complexity." |
| "Worried about the AI sounding robotic" | "Send me 2 minutes — I'll send you a recording of an actual test call." |
| "We handle our own calls fine" | "Cool — most shops who say that lose 1–2 jobs a month to voicemail without realizing. The 30-day trial will tell you either way." |
| "How much does it cost?" | "Zero for 30 days. After that, $199 flat or $49 base. Most shops recover that on the first dispatched job." |
