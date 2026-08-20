# Effiroad cron & polling schedule

> **For AI assistants:** Read this file before answering any question about cron intervals, polling, or “how often does X run?”. Do **not** infer schedules from `vercel.json` alone.

## Production truth (most important)

| What | How often | Where it runs |
|------|-----------|---------------|
| **Tech dispatch timeout + escalation** | **Every 60 seconds** | **[cron-job.org](https://cron-job.org)** → `GET /api/cron/tech-dispatch` |
| **Appointment reminder SMS** | **Every 60 seconds** (same call) | Same external cron as above |
| **Pick-time link nudge** (customer forgot / missed SMS) | **Every 60 seconds** (same call) | Same — remind customer ~90m, escalate owner ~4h |
| Vercel built-in crons | Once per day each | `vercel.json` (Hobby plan limit) |
| **Pricepulse daily snapshot** | **Once per day, 3 shards** | **[cron-job.org](https://cron-job.org)** → `GET /api/cron/pricepulse-collect?slice=N&of=3` |
| Dashboard UI refresh | Every 60 seconds | Browser poll in `lib/hooks/use-dashboard-data.ts` |

### Why two schedulers?

- **Vercel Hobby** rejects sub-daily cron expressions in `vercel.json`. Adding `* * * * *` **blocks deploys** (production froze for ~10h — see git commit `69f0d15`).
- **Real-time crew dispatch** needs ~1-minute escalation when a tech ignores an SMS. That is handled by **cron-job.org** hitting `/api/cron/tech-dispatch` every **60 seconds** with `CRON_SECRET`.
- `vercel.json` still lists `tech-dispatch` at `0 8 * * *` as a **daily backup** (reminders + timeouts if external cron ever fails).

**Source of truth (machine-readable):** `config/cron.schedule.json`

---

## External cron (cron-job.org)

Configure in [cron-job.org](https://cron-job.org) dashboard:

| Field | Value |
|-------|-------|
| URL | `https://effiroad.com/api/cron/tech-dispatch` |
| Interval | **Every 1 minute** (60 seconds) |
| Method | GET |
| Header | `Authorization: Bearer <CRON_SECRET>` |

Alternative (lighter — timeouts only, no appointment reminders):

- URL: `https://effiroad.com/api/cron/tech-offer-escalation`
- Same interval and auth

**Do not** duplicate the 60s schedule in `vercel.json` unless you upgrade to Vercel Pro and accept Hobby deploy risk on other environments.

---

## Pricepulse (Toss Shopping collector)

Daily price/rank snapshot. **Not** in `vercel.json` — it is sharded, and a shard
needs a query string, so it lives at cron-job.org like the other real schedules.

| Field | Value |
|-------|-------|
| URL | `https://<host>/api/cron/pricepulse-collect?slice=0&of=3` (repeat for `slice=1`, `slice=2`) |
| Time | 06:00 / 06:10 / 06:20 KST = **21:00 / 21:10 / 21:20 UTC** |
| Method | GET |
| Header | `Authorization: Bearer <CRON_SECRET>` |

Why sharded: a Vercel function is capped at 60s and the collector paces requests
(default 1.5s gap, robots `Crawl-delay` wins if larger). Targets are assigned to
a shard by index, so a target always lands in the same shard.

**Why a missed run matters:** price and rank history cannot be collected
retroactively. A day skipped is a permanent hole. Failures alert to
`PRICEPULSE_ALERT_WEBHOOK`; see `pricepulse/README.md` for the runbook.

---

## Vercel crons (`vercel.json`) — daily only

All schedules are UTC. **Never add per-minute or hourly entries here on Hobby.**

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/cron/customer-verification` | `0 15 * * *` | Customer verification nudges |
| `/api/cron/daily-briefing` | `0 12 * * *` | Owner daily briefing SMS |
| `/api/cron/tech-dispatch` | `0 8 * * *` | Backup daily dispatch/reminders |
| `/api/cron/agreement-reminders` | `0 9 * * *` | Agreement reminder SMS |
| `/api/cron/revenue-sync` | `0 11 * * *` | Revenue sync |
| `/api/cron/daily-summary` | `0 14 * * *` | Daily summary |
| `/api/cron/beta-cohort-price-step` | `0 10 * * *` | Beta cohort pricing step |
| `/api/cron/quote-follow-up` | `0 16 * * *` | Quote chase SMS (48h, 7d, 14d after quote sent) |

---

## Manual / postbuild endpoints (not in `vercel.json`)

| Path | When |
|------|------|
| `/api/cron/retell-production-sync` | Postbuild + manual (`docs/RETELL_SETUP.md`) |
| `/api/cron/ensure-pilot-trials` | One-off backfill after deploy |
| `/api/cron/tech-offer-escalation` | Optional external 60s target (timeouts only) |
| `/api/cron/giu-reservation-expiry` | **Every 60s** via cron-job.org — Giu unpaid reservation expiry (`docs/GIU_DEPLOY.md`) |

All require `CRON_SECRET` in production (`Authorization: Bearer …` or `x-cron-secret` header).

---

## Browser polling (client-side, not server cron)

| Feature | Interval | File |
|---------|----------|------|
| Dashboard data | 60s (visible tab) | `lib/hooks/use-dashboard-data.ts` |
| Ops failures panel | 15s | `components/settings/OpsFailuresPanel.tsx` |
| Forwarding verify test | 3s | `components/settings/ForwardingTestPanel.tsx` |
| “2m ago” labels | 30s | `lib/hooks/use-relative-now.ts` |

---

## Verify config before deploy

```bash
npm run check:cron
```

This fails the build check if `vercel.json` contains sub-daily cron patterns that would break Vercel Hobby deploys, and prints the external 60s cron reminder.

---

## History (why this looks confusing)

1. `a95d3b0` — Added `/api/cron/tech-offer-escalation` at `* * * * *` in Vercel
2. `69f0d15` — Removed sub-daily Vercel cron (Hobby deploy blocker)
3. `86b624d` — Tried `tech-dispatch` at `* * * * *` in Vercel
4. `f664131` — Reverted; **cron-job.org handles 1min externally**
5. `8c73aac` — Enforced daily-only schedules in `vercel.json`
