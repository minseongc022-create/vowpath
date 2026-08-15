# Too Good To Go (TGTG) — how it works now (2026) vs Giu

Research snapshot for product decisions. Sources: TGTG official How it Works, Zendesk help, Japan launch coverage (2026).

## What TGTG is

World’s largest surplus-food marketplace (~120M users, ~180k partners, 21 countries). Asia entry: **Japan (Tokyo) Jan 2026** — first Asian market; partners include FamilyMart, Krispy Kreme, NewDays.

**Not in Vietnam or Korea** as of this research. Korea has local competitors (마감히어로, 럭키밀, 라스트오더) + delivery apps’ 마감할인.

## Customer loop (current)

1. **Discover** — map + list of Surprise Bags near you; filters (today/tomorrow, category); sort by distance/price/rating.
2. **Reserve & pay** — pay in-app (~1/3 of retail typical).
3. **Pickup window** — store-defined collection time.
4. **Collect** — show **in-app receipt** + **swipe to confirm** (screenshot/email alone can be refused).
5. **Extras** — Favorites + alerts when bag available; Ask-a-Friend (delegate pickup); Profile impact (meals/CO₂/water saved); some markets: parcels/delivery.

## Merchant loop

- Store sets how many Surprise Bags for the day (or none if no surplus).
- Contents are a **surprise** (flexible leftovers).
- Revenue from food that would be discarded; TGTG takes commission / partner fee model (varies by market).

## Product strengths Giu should copy

| TGTG | Giu now | Gap closed in this PR? |
|------|---------|------------------------|
| Map + distance | Address text + Google Maps link | Partial (link, not embedded map) |
| Favorites + push when available | Waitlist phone only | Waitlist on empty hop |
| Clear pickup window on listing | Default 19–21, now merchant-set | Yes |
| In-app pickup confirm (swipe) | Merchant taps “픽업 완료” | Merchant confirm dialog |
| Payment status clarity | Silent fail redirects | Pay banners + auto-poll |
| Impact stats | Seed stats only | Later |
| Local language | KO only | KO/VI toggle |
| Chain density (CVS) | Indie bakeries | Strategy, not code |

## What not to copy blindly

- **Swipe-to-confirm app lock-in** — needs native/PWA polish; Giu code + merchant confirm is OK for MVP.
- **Surprise-only** — Giu can keep titled boxes (clearer for first users).
- **Global brand ops** — TGTG wins with CVS chains; Giu wins with empty cities (HCMC) + escrow story.

## Implication for Giu

Stay on **HCMC bakery/café density + escrow + LS payments**. Depth work (this branch): payment trust, merchant counter UX, maps/Zalo, search, VI, settlement summary — the same “comfort layer” TGTG already has.
