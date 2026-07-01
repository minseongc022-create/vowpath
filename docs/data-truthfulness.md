# Effiroad Data Honesty Rules

**Rule: never show fake, estimated, or placeholder numbers as if they are real data.**

---

## 1. Revenue (Collected)

| Condition | Rule |
|-----------|------|
| Jobber connected + sync OK | Show `collectedCents` from `RevenueFact` — real invoice payments only |
| Jobber not connected | Empty state: "Connect Jobber to see collected revenue" — never show $0 |
| `avgJobTicketUsd × call count` | Never show as revenue on dashboard — this is a settings default, not collected money |
| AI-attributed revenue | Only show `attributedToEffiroad=true` facts from ledger with Jobber invoice ID |

**Helper:** `canShowRevenue(jobberConnected)` from `lib/data-truthfulness.ts`

---

## 2. Call / Booking KPIs

- `inboundTotal`, `inboundAnsweredByAi`, `bookingsFromAiCalls` — from real Twilio + DB events only
- `RecoveryMetricsPanel` pattern: no revenue estimates, counts only
- Never inflate counts to make the dashboard look better than reality

---

## 3. Missed Call Analytics

- Show actual AI-handled call count
- `estimatedMissedWithoutEffiroad` if shown: must have tooltip "calls Effiroad handled — not dollar value"
- Dollar conversion of missed calls: never shown in dashboard panels

---

## 4. Practice Mode (Shadow Mode)

- When `shadowModeRemaining > 0`: show global banner "Practice mode — SMS and Jobber not sent"
- Practice bookings: never counted in live KPIs (`inShadowBaseline` flag in `lib/recovery-roi.ts`)
- **Helper:** `isPracticeMode(settings)` from `lib/data-truthfulness.ts`

---

## 5. AI Intake Fields

- Confidence < 65 on any core field → show "Unverified" badge, do not auto-dispatch
- Empty/Unknown AI field → display "—" or "Not provided" — never show "Unknown" as a real value
- **Helper:** `fieldDisplayValue(value)` from `lib/data-truthfulness.ts`

---

## 6. Calendar / Slots

- Only show slots from Jobber or native calendar — never fake availability
- If calendar sync fails: show "Slots unavailable — submit request and we'll call"

---

## 7. Jobber Sync

- Show `syncedAt` timestamp on revenue panel
- Stale (>6h): amber warning (existing `DashboardHomeView` pattern)
- Failed sync: amber warning — never pretend data is fresh

---

## 8. Dashboard Empty States

All panels when no data:
- "No data yet" + next action (connect Jobber / forward phone / run test call)
- Never style zero as an achievement

---

## 9. Marketing Site

- Comparison table / hero numbers (e.g. "$8K job") = industry benchmarks — not Effiroad user data
- Never mix marketing estimates with dashboard metrics
- Any benchmark number: label source ("US restoration industry average")

---

## Implementation

```typescript
import {
  canShowRevenue,   // gate for showing collected revenue panel
  isPracticeMode,   // gate for shadow mode banner
  fieldDisplayValue, // safe display for AI-extracted fields
  safeRevenueDisplay, // safe revenue formatting (null if no Jobber)
  ESTIMATE_LABEL,   // suffix for estimated values
  ESTIMATE_TOOLTIP, // tooltip for estimated values
  REVENUE_EMPTY_STATE, // "Connect Jobber..." message
} from "@/lib/data-truthfulness";
```

---

## Audit Checklist

Run before each release:
- [ ] `grep -r "avgJobTicketUsd" components/dashboard` → must not display as revenue
- [ ] `grep -r "estimatedMissed" components/dashboard` → must have "Estimate" label
- [ ] `grep -r "fake\|mock\|placeholder" lib/` → should be zero hits in business logic
- [ ] `CollectedRevenuePanel` hides when `!jobberConnected`
- [ ] `RecoveryMetricsPanel` shows no dollar amounts
- [ ] Shadow mode banner visible when `shadowModeRemaining > 0`
