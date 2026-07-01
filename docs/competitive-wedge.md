# Effiroad Competitive Wedge

**Claims in this document are based on implemented, shipped features only.**

---

## vs. ServiceAgent

| Feature | Effiroad | ServiceAgent |
|---------|----------|-------------|
| Restoration-aware triage | Yes — water auto-dispatch, fire/Cat-3/sewage hold | No — blind auto-dispatch |
| HVAC gas smell hold | Yes — hardcoded safety hold | Unknown |
| Confidence gate (65% min) | Yes — low-confidence intake never auto-dispatches | No documented gate |
| Owner 1/2 SMS approval | Yes — holds wait for reply | Auto-dispatches regardless |
| Unverified address gate | Yes — never dispatches to unknown address | Not documented |
| Multi-vertical (restoration + HVAC + plumbing…) | Yes | Restoration-focused |
| Pricing | $199/mo unlimited or $49+$18/dispatch | Contact for pricing |

**Key wedge:** "Effiroad knows the difference between a water leak and a sewage backup, and between no heat and a gas smell. ServiceAgent dispatches everything."

---

## vs. Call Center ($800–$2,000/mo)

| Feature | Effiroad | Answering Service / Call Center |
|---------|----------|---------------------------------|
| Response time | AI answers in <2 rings | Human agent answers (ring time varies) |
| 24/7 consistency | Yes — same quality every call | Depends on agent, shift, training |
| Price | $199/mo | $800–2,000+/mo |
| Insurance-ready intake | Yes — captures carrier, claim #, water source | Varies by service |
| Restoration triage knowledge | Yes — built-in loss category logic | Agent training required |
| Owner SMS hold | Yes | Depends on service |
| Dashboard + analytics | Yes | No |

**Key wedge:** "A call center costs 4–10x more and isn't available at 2 AM with a trained restoration triage protocol."

---

## vs. DASH / Albi (CRM-first)

| Feature | Effiroad | DASH / Albi |
|---------|----------|-------------|
| Requires CRM migration | No — works alongside any stack | Full CRM replacement |
| Phone intake | Yes — 24/7 AI | Limited |
| Auto-dispatch | Yes | Requires full DASH setup |
| Jobber compatibility | Optional sync | Competing product |
| For shops with no CRM | Yes — works standalone | Requires CRM adoption |

**Key wedge:** "DASH replaces your whole operation. Effiroad just adds an AI layer on your existing phone and workflow."

---

## Measurable differentiators

These are implemented and testable:

1. **Confidence gate:** `AUTO_BOOK_CONFIDENCE_MIN = 65` — any intake with core field confidence below 65% is held for owner review, never auto-dispatched.

2. **Safety hold categories (restoration):** fire, sewage_cat3, commercial — always held regardless of priority or confidence.

3. **Safety hold patterns (HVAC):** gas smell, sparking — always urgent hold, owner SMS required before dispatch.

4. **Clear P1 water auto-dispatch:** P1 water loss + verified address + confidence ≥ 65 + in service area → crew SMS without blocking owner.

5. **Practice mode:** 14-day shadow baseline — no customer SMS or Jobber push until owner confirms setup works.

6. **Owner 1/2 SMS:** held jobs send owner a numbered SMS. Reply "1" to approve dispatch, "2" to decline. Reply "9" within undo window to reverse an auto-dispatch.

---

## What Effiroad does NOT claim

- Does not replace Jobber, DASH, or ServiceTitan (it's an intake/dispatch layer)
- Does not handle dispatch routing beyond crew SMS (no GPS, no job sequencing)
- Does not guarantee specific response times (network-dependent)
- Does not integrate with insurance carriers directly
- Does not provide AI-generated documentation for claims (intake data only)
