# Content Autopilot

Concept-matched long-form blog engine with quality gates.

## What this is

An overnight pipeline that:

1. Picks topics that match each brand concept
2. Builds a research brief (no copyrighted news dumps)
3. Writes long-form Korean drafts in brand voice
4. Humanizes + runs a **quality gate** (rejects AI slop / deceptive bait)
5. Publishes to filesystem, WordPress, or Blogger

## What this is not

- A guarantee of ₩10M/month AdSense revenue
- A Naver→Google bait / traffic-manipulation kit
- A gossip/news-scrape spam farm

Revenue depends on niche, distribution, policy risk, and months of compounding assets. Software cannot force ad income.

## Quick start

```bash
cd content-autopilot
npm install
cp .env.example .env
npm test
npm run dry-run -- --brand finance-salary
```

Real LLM:

```bash
# .env
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4.1-mini
PUBLISH_MODE=draft
npm run produce -- --brand finance-salary
npm run nightly
```

## Brands

Edit / add JSON in `brands/*.brand.json`:

- concept, audience, voice
- topic pillars / avoid list
- quality thresholds
- publish platform

## Cron (sleep mode)

```cron
0 3 * * * cd /path/to/content-autopilot && npm run nightly >> data/cron.log 2>&1
```

## Publish targets

| Mode | Env |
|------|-----|
| filesystem (default/dev) | `PUBLISH_MODE=filesystem` |
| WordPress draft/publish | `WP_BASE_URL`, `WP_USERNAME`, `WP_APP_PASSWORD` |
| Blogger | `BLOGGER_BLOG_ID`, `BLOGGER_ACCESS_TOKEN` |

## Architecture

```
Brand config → Topic selector → Research brief
    → Long-form writer → Humanize → Quality gate
    → (retry if fail) → Publisher
```
