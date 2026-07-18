# Outreach email — avoid spam folder

> For cold outreach to US restoration/HVAC shops. Not legal advice.

## 1. Use the right sender (best → ok)

| Priority | Address | Notes |
|----------|---------|--------|
| **Best** | `hello@effiroad.com` or `min@effiroad.com` | After **Resend domain verification** (SPF + DKIM on effiroad.com) |
| **OK for cold mail** | `helloeffiroad@gmail.com` or `min.effiroad@gmail.com` | Personal Gmail — warm up slowly |
| **Avoid for cold mail** | `support@effiroad.com` via unverified Resend | Often lands in spam until domain is authenticated |

### Resend domain setup (do this on effiroad.com DNS)

1. [resend.com](https://resend.com) → **Domains** → Add `effiroad.com`
2. Add the **SPF**, **DKIM**, and **DMARC** records Resend shows (Porkbun / Cloudflare DNS)
3. Wait for green “Verified”
4. Set Vercel env: `EMAIL_FROM=Effiroad <hello@effiroad.com>`
5. Redeploy

Until verified, product emails and cold outreach from `@effiroad.com` will spam-filter easily.

---

## 2. Gmail warm-up (if using Gmail for outreach)

| Day | Max cold emails |
|-----|-----------------|
| 1–3 | 5/day |
| 4–7 | 10/day |
| Week 2+ | 15–20/day |

- Fill out Gmail profile (name, photo)
- Send a few normal emails to yourself / friends first
- **Never** BCC 20 shops in one email — one recipient per send

---

## 3. Message content (spam triggers to avoid)

**Do**
- Plain text or minimal HTML
- `[Shop name]` in subject — personalized
- Physical address in signature optional; link to effiroad.com once
- Include: `Reply PASS to opt out`
- Include pilot disclaimer (see `lib/outreach/partnership-pilot-copy.ts`)

**Don’t**
- ALL CAPS subject
- “FREE!!!” “GUARANTEED” “ACT NOW”
- Multiple links or link shorteners
- Attachments on first email
- Image-only emails

**Good subject examples**
- `All Elite Restoration — after-hours dispatch`
- `Justin — quick question about 2am calls`

---

## 4. Timing

| US region | Local send window | Korea time (approx.) |
|-----------|-------------------|----------------------|
| FL / GA (ET) | Tue–Thu 8–10am | 9–11pm |
| TX (CT) | Tue–Thu 8–10am | 10pm–midnight |

Avoid Monday AM (inbox overload) and Friday PM.

---

## 5. If mail still goes to spam

1. Ask a friend with Gmail to mark “Not spam” once (helps reputation slightly)
2. Check [mail-tester.com](https://www.mail-tester.com) — send one test, aim for 8+/10
3. Confirm SPF/DKIM pass in the raw email headers
4. Switch to Gmail personal (`min.effiroad@gmail.com`) for cold; keep `hello@effiroad.com` for product after domain verify
5. Reduce volume; increase personalization (one line from their Google review)

---

## 6. Recommended Gmail address

`effiroad@gmail.com` is taken. Use:

- **`helloeffiroad@gmail.com`** — company feel
- **`min.effiroad@gmail.com`** — founder feel (often better reply rate for cold)

Display name: `Min — Effiroad` (not just “Effiroad”)

---

## 7. TRY reply template (no live call)

When a shop replies TRY, send signup link + self-serve steps from `partnershipPilotCopy.tryReplyTemplate` — no Zoom required.
