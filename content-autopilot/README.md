# Content Autopilot

Concept-matched long-form blog engine with factual + quality gates.

## What this is

An overnight pipeline that:

1. Picks topics that match each brand concept
2. Builds a research brief (no copyrighted news dumps)
3. Writes **2000+ character** Korean drafts in brand voice
4. Humanizes → **fact-check pass** → **quality gate** (slop / deceptive bait / fabrication)
5. Publishes to **Naver (HTML export)**, WordPress, or Blogger

## What this is not

- A guarantee of ₩10M/month AdSense revenue
- A Naver→Google bait / traffic-manipulation kit
- A gossip/news-scrape spam farm

## Quick start

```bash
cd content-autopilot
npm install
cp .env.example .env
npm test
npm run dry-run -- --brand personal-naver
```

### Connect platforms (local dashboard)

```bash
npm run dashboard
# → http://127.0.0.1:3847
# WordPress / Blogger credentials saved to data/connections.json
# Naver: HTML export (no official post API)
```

### Generate all 3 platforms + notification

```bash
# Offline mock (no API key):
MOCK_LLM=1 npm run generate-all

# Real LLM:
LLM_API_KEY=sk-... npm run generate-all
```

Notification lands in `data/inbox/latest.json`. Optional: `NOTIFY_WEBHOOK_URL` or `NTFY_TOPIC` in `.env`.

## Commands

| Command | Description |
|---------|-------------|
| `generate-all` | Naver + WordPress + Blogger — 1 post each + notify |
| `dashboard` | Web UI to save platform connections |
| `dry-run` | Offline mock pipeline |
| `produce --brand <id>` | Single brand with real LLM |
| `nightly` | All brands batch |

## Platform brands

| ID | Platform |
|----|----------|
| `personal-naver` | Naver — HTML export for paste |
| `personal-wordpress` | WordPress draft (needs credentials) |
| `personal-blogger` | Blogger draft (needs OAuth token) |

Without credentials, WordPress/Blogger fall back to filesystem output under `data/output/`.

## Publish targets

| Platform | How |
|----------|-----|
| Naver | `data/naver-export/` HTML + markdown |
| WordPress | REST API draft/publish |
| Blogger | API draft/publish |
| filesystem | `data/output/` (dev fallback) |

## Safety rules (built-in)

- **Factual only**: blocks 속보/단독/허위 통계 패턴
- **Platform safe**: duplicate paragraphs, keyword stuffing, shouting titles
- **Clickbait titles OK** if body stays honest

## Architecture

```
Brand config → Topic selector → Research brief
    → Long-form writer → Humanize → Fact-check
    → Quality gate → (retry if fail) → Publisher → Notify
```
