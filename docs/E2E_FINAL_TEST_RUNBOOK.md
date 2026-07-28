# Effiroad — final end-to-end test runbook (phone-first)

Phone answering + dispatch is the **main** product. Quotes & estimate follow-up are **included** utilities — never sell them as equal.

Use production `https://effiroad.com` after deploy, or the Vercel preview URL for this branch.

---

## 0. Before you start

| Check | How |
|-------|-----|
| Site loads | Open home — hero is about **missed calls / AI phone**, not Quote+Chase as equal hero |
| Nav | Header has Features / How it works / Pricing — **no** primary “Quote + Chase” nav item |
| Product stack | Phone card = **Main**; Quote & Follow-up = **Included** |
| Env | Twilio + Retell + KV + `CRON_SECRET` set on Vercel |
| Cron | `quote-follow-up` and `tech-dispatch` per `CRON.md` / cron-job.org |

---

## 1. Signup → onboarding (happy path)

1. Open `/signup` → create shop (US email, shop name, phone).
2. Complete onboarding: vertical, forwarding notes, optional Jobber skip.
3. Land on `/dashboard`.
4. **Expect:** Home emphasizes calls/jobs; Quotes promo says **Included**, not a peer product.

---

## 2. Main product — phone intake (must pass)

### 2a. Link intake (no live call needed)

1. Dashboard → get **intake / text link** (or Settings → share link).
2. Open link on phone → submit a **service** request (address, issue, callback).
3. **Expect:** Job appears on dashboard; owner alert SMS/email if configured.

### 2b. Live call (production Twilio)

1. Forward shop number → Effiroad Twilio number (or call Twilio number directly).
2. Press **1** (service) → speak issue + address → confirm.
3. **Expect:** Call log + job card; P1 water may auto-dispatch per rules; owner gets 1/2/9 SMS when gated.
4. Press **2** (estimate) on a second call → estimate lead in **Quotes**.

### 2c. Owner controls

1. Open pending job → Approve / Reject / adjust priority.
2. Mark scheduled / completed.
3. **Expect:** Customer SMS on status change when phone on file.

---

## 3. Included utility — quote (secondary)

1. Open `/dashboard/quotes` (or booking detail).
2. Create/edit **estimate doc** (line items) **or** set dollar quote.
3. **Send to customer** (SMS + share link `/e/...`).
4. Open share link in incognito → amount/shop name visible.
5. **Expect:** Job shows as Sent; chase clock starts (`quoteSentToCustomerAt`).

---

## 4. Included utility — follow-up chase

1. Open Quotes → **Chase / follow-up** tab.
2. With a sent quote and marketing SMS consent:
   - Wait for due stage **or** temporarily set sent time back 3+ days in DB/KV for a test job.
3. Hit cron (prod):  
   `curl -H "Authorization: Bearer $CRON_SECRET" https://effiroad.com/api/cron/quote-follow-up`
4. **Expect:** SMS sent; chase stage chip advances (48h → 7d → 14d).
5. Mark job **scheduled** → chase stops.

---

## 5. Billing / entitlement

1. Trial active → phone + quotes work.
2. Open `/pricing` or billing portal → Flex/Pro still framed as **dispatch/voice**, not “Quote SaaS”.
3. Cancel/reactivate only if you intend to; don’t leave a live shop mid-test without restoring trial.

---

## 6. Regression checklist (15 min)

| # | Action | Pass? |
|---|--------|-------|
| 1 | Home hero = phone/missed calls | ☐ |
| 2 | Quote strip = “Included”, below product stack | ☐ |
| 3 | Signup → dashboard | ☐ |
| 4 | Link intake creates job | ☐ |
| 5 | Live call press 1 creates job | ☐ |
| 6 | Owner approve/reject | ☐ |
| 7 | Estimate send + share link | ☐ |
| 8 | Chase cron / queue | ☐ |
| 9 | Mobile dashboard usable | ☐ |
| 10 | `/quote` page says included, phone first | ☐ |

---

## 7. If something fails

| Symptom | Check |
|---------|--------|
| No SMS | Twilio balance, messaging service, A2P, consent |
| No AI voice | Retell agent sync (`npm run retell:sync`), webhook URLs |
| Jobs missing | Vercel KV, `listJobs` user id |
| Chase never sends | Consent, `quoteSentToCustomerAt`, cron auth, intervals 2/7/14 days |
| Wrong branding | Hard refresh; confirm this branch deployed |

---

## Positioning reminder (for anyone testing copy)

- **Say:** “AI answers your phone and dispatches; quotes/follow-up are included.”
- **Don’t say:** “Answer · Quote · Chase” as three equal products.
