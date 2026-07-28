# Effiroad — full post-upgrade test checklist

Phone answering + dispatch = **main**. Quotes & estimate follow-up = **included only**.

**Prod:** https://effiroad.com  
**Two phones required for clean SMS tests:** Owner alert ≠ Customer. Same phone mixes threads.

---

## A. Marketing / landing (5 min)

| # | Check | Pass? |
|---|--------|-------|
| A1 | Home order: **Hero → Q&A → Demo → How it works → Quotes strip → Pricing → FAQ → CTA** | ☐ |
| A2 | Hero = missed-call / phone first (not Quote+Chase as equal hero) | ☐ |
| A3 | Q&A right under hero — owner questions, no “AI male voice” fluff | ☐ |
| A4 | Demo `#demo` plays; secondary CTA “See it in action” jumps there | ☐ |
| A5 | Quotes strip says **Included**, not a peer product | ☐ |
| A6 | Nav: Features / How it works / Pricing — no primary “Quote + Chase” | ☐ |
| A7 | Mobile: hero + Q&A readable, no overflow | ☐ |
| A8 | `/quote` page still says included / phone-first | ☐ |

---

## B. Settings phones (do this first)

| # | Check | Pass? |
|---|--------|-------|
| B1 | Settings → **Shop / owner alert phone** = YOUR phone (승인 문자) | ☐ |
| B2 | Test customer uses a **different** number | ☐ |
| B3 | Shop display name set (shows in SMS prefix) | ☐ |
| B4 | Optional: Crew tech phone = third number or your phone for solo crew tests | ☐ |

---

## C. Main product — SMS link intake (must pass)

1. Call Effiroad number → press **1** (service) → choose **text link** (or send link from dashboard).
2. **Customer phone** gets: `ShopName: Hi! Thanks for calling! Finish here… link…`  
   → **No `[SHOP]`**
3. Open link → fill name / address / issue / window → submit.
4. **Owner phone** gets: `[SHOP] ShopName: SMS link needs approval… Reply 1=Approve, 2=Reject`  
   → **Must start with `[SHOP]`**
5. **Customer** gets confirmation: `Request #VP-…` and/or `Booked for …`  
   → **No `[SHOP]`**
6. Owner replies **1** (or Approve in dashboard).
7. Dashboard shows job; status advances.

| # | Expect | Pass? |
|---|--------|-------|
| C1 | Customer link SMS (no `[SHOP]`) | ☐ |
| C2 | Owner approval SMS (`[SHOP]` …) | ☐ |
| C3 | Customer booking / request SMS (no `[SHOP]`) | ☐ |
| C4 | Job on dashboard | ☐ |
| C5 | Owner 1 / 2 works | ☐ |

---

## D. Main product — live phone intake

1. Call → press **1** → talk through issue + address (not text link).
2. Expect call log + job; risky jobs wait for owner **1 / 2**.
3. Second call → press **2** (estimate) → lead in **Quotes**.

| # | Expect | Pass? |
|---|--------|-------|
| D1 | Press 1 creates service job | ☐ |
| D2 | Owner gated SMS has `[SHOP]` when approval needed | ☐ |
| D3 | Press 2 creates estimate / Quotes lead | ☐ |
| D4 | AI answers (Retell) — call doesn’t drop | ☐ |

---

## E. Owner controls & customer status SMS

| # | Action | Expect | Pass? |
|---|--------|--------|-------|
| E1 | Approve pending job | Customer “approved / booked” SMS (no `[SHOP]`) | ☐ |
| E2 | Reject | Customer reject SMS | ☐ |
| E3 | Auto-booked FYI | Owner: `[SHOP] … Booked … Reply 9 to undo` | ☐ |
| E4 | Reply **9** within window | Undo works | ☐ |
| E5 | Mark scheduled / completed | Dashboard + optional review SMS | ☐ |

---

## F. Crew dispatch + ETA (if enabled)

| # | Action | Expect | Pass? |
|---|--------|--------|-------|
| F1 | Job offered to tech | Tech SMS (Effiroad / accept-pass) | ☐ |
| F2 | Tech replies **1** | Accepted | ☐ |
| F3 | Tech replies minutes (e.g. **30**) or dashboard “On my way” | Customer ETA + map link | ☐ |
| F4 | No crew accepts | Owner: `[SHOP] … No crew accepted…` | ☐ |

---

## G. Included — quotes

| # | Action | Expect | Pass? |
|---|--------|--------|-------|
| G1 | `/dashboard/quotes` — create estimate or dollar quote | Saves | ☐ |
| G2 | Send to customer | SMS + `/e/...` share link | ☐ |
| G3 | Open share link incognito | Amount + shop visible | ☐ |
| G4 | Job = Sent; chase clock starts | ☐ |

---

## H. Included — quote chase cron

1. Sent quote + customer marketing SMS consent.
2. Force due (wait or set `quoteSentToCustomerAt` back 3+ days) **or** wait for daily cron `0 16 * * *` UTC.
3. Manual:  
   `curl -H "Authorization: Bearer $CRON_SECRET" https://effiroad.com/api/cron/quote-follow-up`
4. Expect chase SMS; stage 48h → 7d → 14d. Mark scheduled → chase stops.

| # | Pass? |
|---|-------|
| H1 | Chase SMS sends | ☐ |
| H2 | Stage advances | ☐ |
| H3 | Stops when booked | ☐ |

---

## I. Cron / infra smoke

| # | Check | How | Pass? |
|---|--------|-----|-------|
| I1 | Tech dispatch every **60s** | cron-job.org → `/api/cron/tech-dispatch` + `CRON_SECRET` | ☐ |
| I2 | Do **not** put `* * * * *` in `vercel.json` | `npm run check:cron` | ☐ |
| I3 | Twilio webhooks | `npm run twilio:check` → voice/SMS → effiroad.com | ☐ |
| I4 | Twilio balance / A2P | `npm run twilio:status` | ☐ |

---

## J. Billing / entitlement (light)

| # | Check | Pass? |
|---|--------|-------|
| J1 | Trial shop: phone + quotes work | ☐ |
| J2 | Pricing = dispatch / voice framing, not “Quote SaaS” | ☐ |

---

## K. 15-min regression (minimum before calling it done)

| # | Action | Pass? |
|---|--------|-------|
| 1 | Landing: Hero → Q&A → Demo | ☐ |
| 2 | Two phones configured | ☐ |
| 3 | Link intake → customer link SMS | ☐ |
| 4 | Owner `[SHOP]` approval SMS | ☐ |
| 5 | Customer confirm SMS (no `[SHOP]`) | ☐ |
| 6 | Owner 1 approve | ☐ |
| 7 | Live call press 1 | ☐ |
| 8 | Quote send + link | ☐ |
| 9 | Mobile dashboard usable | ☐ |

---

## If something fails

| Symptom | Check |
|---------|--------|
| Owner & customer look the same | Same phone? Look for `[SHOP]`. Fix owner alert ≠ customer. |
| No SMS at all | Twilio balance, A2P, messaging service, consent, US routing |
| Owner never gets SMS | Settings owner/alert phone; `resolveOwnerAlertPhone` |
| Customer never gets SMS | Booking callback phone; STOP opt-out |
| Bare hex fragment only | Long URL split across SMS segments — open full prior message |
| No AI voice | Retell sync, Twilio voice URL |
| Chase never sends | Consent, `quoteSentToCustomerAt`, cron auth, 2/7/14d windows |
| Jobs missing | KV / wrong user id |

---

## Positioning (copy check while testing)

- **Say:** “AI answers your phone and dispatches; quotes/follow-up are included.”
- **Don’t say:** “Answer · Quote · Chase” as three equal products.
