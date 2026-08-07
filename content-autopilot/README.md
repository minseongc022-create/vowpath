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

## Quick start (전부 한 번에)

```bash
cd content-autopilot
chmod +x scripts/setup-all.sh
./scripts/setup-all.sh          # .env + 3플랫폼 생성 + 알림
npm run dashboard               # http://127.0.0.1:3847 — API키/플랫폼/생성
```

또는:

```bash
npm install
npm run setup
npm run dashboard
```

### Connect platforms (phone-friendly PWA)

```bash
npm run phone
# PC 터미널에 나오는 "폰: http://192.168.x.x:3847" 주소로 접속
# Safari/Chrome → 홈 화면에 추가 → 앱처럼 사용
```

**폰에서 하는 일**
- 🏠 홈 → **3개 플랫폼 전부 생성** (큰 버튼)
- 🔔 **폰 알림 켜기** → ntfy 앱 자동 연결
- 🔗 연결 → 네이버 ID / WordPress / Blogger
- ⚙️ 설정 → LLM API 키

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
| `phone` / `dashboard` | Mobile PWA UI (Wi‑Fi 접속 + 홈 화면 추가) |
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
