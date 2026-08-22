# Jarvis / Effiroad 토스쇼핑 — Claude AI 인수인계

> **대상:** Claude (또는 후속 AI 코딩 에이전트)  
> **사용자:** minseongc022@gmail.com  
> **프로덕션:** https://effiroad.com  
> **Pro 코드:** `effiroad-tspro-539d`  
> **목표:** 월 1,000만 원 (토스쇼핑 위탁·Jarvis Full Autopilot)

---

## 0. 지금 상태 (2026-08-22 기준)

| 항목 | 상태 |
|------|------|
| main 최신 | `208a785` (CI fix) + `0ff9569` (Jarvis v4) |
| PR #314 | Coupilot급 시장분석 + 다중 AI 상세 — **머지·배포됨** |
| PR #315 | CI Giu/Effiroad 검증 수정 — **머지·CI green** |
| effiroad.com | Jarvis API 라우트 live (401=인증필요, 404=미배포) |
| **미완 (사람/시크릿 필요)** | Vercel env 시크릿, cron-job.org 60s, Toss 카테고리ID, 도매꾹 키, OpenAI 키 |

**Claude가 첫으로 할 일:** 아래 §9 체크리스트 실행 → §10 TODO 순서대로.

---

## 1. 제품 한 줄 요약

**Effiroad(에피로드)** = 토스쇼핑 셀러용 SaaS. AI 이름 **Jarvis**.

```
시장·키워드 분석 → 도매매/도매꾹 소싱 → AI 상세페이지 → 등록 미리보기(수익·이유)
  → [OK · Jarvis 전체 실행] → 토스 상품 등록 + 위탁 발주 URL
  → (60초 cron) 토스 주문 감지 → 상품준비 → 도매매 발주 메모 → 송장 토스 등록
```

Coupilot은 **쿠팡 데이터**에 강함. Jarvis는 **토스 실행**(등록·주문·송장)에 강함. v4에서 Coupilot급 **분석 UI** 추가.

---

## 2. 디렉터리 지도 (필수 파일)

### 2.1 Jarvis 엔진 (`toss-shop/lib/seller-engine/`)

| 파일 | 역할 |
|------|------|
| `jarvis-engine.ts` | **93% 신뢰도 게이트**, 통합 점수, certified 필터 |
| `jarvis-autopilot-engine.ts` | **60초 cron** 오케스트레이션 (초안 생성, fulfillment) |
| `jarvis-health-check.ts` | 채팅 약속 기능 점검 리포트 (Health API) |
| `jarvis-pick-brief.ts` | 등록 전 수익·이유·게이트 미리보기 |
| `toss-market-engine.ts` | **v4** Coupilot급 심층 키워드 (wing, SERP, 광고입찰) |
| `review-selling-points.ts` | 리뷰/상품명 → 셀링포인트 AI (OpenAI optional) |
| `detail-page-providers.ts` | **v4** 상세 다중 프로바이더 체인 |
| `detail-page-engine.ts` | 상세 생성 진입점 → providers 호출 |
| `hookable-detail-engine.ts` | 로컬 Hookable-class HTML (무료 폴백) |
| `matchcut-adapter.ts` | 1688+OpenAI 비전 파이프 / Hookable 폴백 |
| `listing-automation.ts` | Pick → Detail → `JarvisListingDraft` |
| `consignment-order.ts` | 위탁 발주 **URL+고객정보 기록** (API 자동발주 없음) |
| `fulfillment-engine.ts` | 토스 주문 → preparing → wholesale_ready → 송장 |
| `consignment.ts` | 위탁 pick 5개/일 생성 |
| `import-sales.ts` | 수입 pick 생성 |
| `ad-strategy-engine.ts` | 광고·키워드 **설계만** (토스 Ads API 없음) |
| `wholesale-composition-engine.ts` | Item Winner 회피·구성 분석 |
| `top-seller-playbook.ts` | 상위셀러 12전술 |
| `policy-engine.ts` / `risk-playbook.ts` | 정책·리스크 |
| `goal-engine.ts` / `revenue-engine.ts` | 월 1천만 목표·수익 브리핑 |
| `intelligence.ts` / `pricing.ts` | 키워드·가격 intelligence |

### 2.2 데이터·스토어

| 파일 | 역할 |
|------|------|
| `toss-shop/lib/store.ts` | **God module** — KV 단일 키 `toss-shop:store:v1`, auth, sync, cron, execute |
| `toss-shop/lib/types.ts` | 전 도메인 타입 |
| `toss-shop/lib/seed.ts` | 데모 merchant/catalog |
| `toss-shop/lib/catalog.ts` | 키워드 분석, 가격 시뮬 (데모) |
| `toss-shop/lib/market-collector/index.ts` | 카탈로그 → marketKeywords |
| `toss-shop/lib/discovery.ts` | 발굴 키워드 시드 |

### 2.3 Toss Shopping API

| 파일 | 역할 |
|------|------|
| `toss-shop/lib/api/client.ts` | OAuth + FEP 호출 |
| `toss-shop/lib/api/sync-merchant.ts` | 상품·정산·키워드 동기화 |
| `toss-shop/lib/api/create-product.ts` | 토스 상품 등록 POST |
| `toss-shop/lib/api/orders.ts` | 주문·상품준비·송장 |
| `toss-shop/lib/api/config.ts` | env + merchant별 API 키 |

### 2.4 API 라우트 (`app/api/toss-shop/`)

| 경로 | 메서드 | 인증 | 설명 |
|------|--------|------|------|
| `jarvis/health` | GET | Session | Health 리포트 |
| `jarvis/autopilot` | GET/POST | Session / Pro(POST) | Autopilot 상태·수동 실행 |
| `market/deep-analysis` | GET | Session + 키워드 quota | v4 심층 분석 |
| `listings` | GET/POST | Pro | 등록함 목록·초안 생성 |
| `listings/[id]/execute` | POST | Pro | **OK · 전체 실행** (토스등록+발주) |
| `listings/[id]/approve\|reject\|publish` | POST | Pro | 단계별 |
| `fulfillment` | GET/POST | Session / Pro | 발주함·송장 등록 |
| `consignment` / `import-sales` | GET | Pro | AI pick |
| `keywords` / `discovery` | GET | Session/Pro | 키워드·발굴 |
| `auth/login` `auth/connect` | POST | Public | 로그인·토스 API 연동 |
| `billing` | GET/POST | Session | Pro 결제·활성화코드 |
| `settings` | GET/POST | Pro(POST) | API 키 저장 |

**Cron:** `app/api/cron/toss-shop-sync/route.ts` → `syncAllMerchants()`  
**인증:** `Authorization: Bearer $CRON_SECRET` 또는 `x-cron-secret`

### 2.5 UI (`app/(toss-shop)/toss-shop/` → effiroad.com `/`)

| URL | 컴포넌트 |
|-----|----------|
| `/dashboard` | `JarvisCommandCenter` + 홈 |
| `/dashboard/keywords` | `KeywordsPanel` — **「Jarvis 심층」** 탭 |
| `/dashboard/listings` | `JarvisListingPanel` — 미리보기·OK·실행 |
| `/dashboard/consignment` | `ConsignmentPanel` |
| `/dashboard/import` | `ImportPanel` |
| `/dashboard/discovery` | `DiscoveryPanel` |
| `/dashboard/settings` | API 연동·Pro |

라우팅: `middleware.ts` + `NEXT_PUBLIC_SELLER_PULSE_AT_ROOT=1` → apex에서 `/`가 toss-shop.

### 2.6 설정·문서

| 파일 | 내용 |
|------|------|
| `docs/TOSS_SHOP_SETUP.md` | env·cron·Jarvis 설정 |
| `CRON.md` | **cron 60초는 cron-job.org** (vercel.json 일 1회는 백업) |
| `config/cron.schedule.json` | 기계 판독 cron |
| `vercel.json` | build.env 기본값 |
| `scripts/toss-shop-production-env.mjs` | Vercel 시크릿 push |
| `scripts/effiroad-deploy-verify.mjs` | 배포 후 Jarvis 라우트 검증 |
| `scripts/jarvis-setup-checklist.mjs` | 로컬 env 체크리스트 |

---

## 3. 핵심 메커니즘

### 3.1 Jarvis 93% 게이트 (`jarvis-engine.ts`)

Pick이 `jarvis.certified === true` + `confidencePct >= 93` 이어야:
- Autopilot이 **자동 등록 초안** 생성
- Listing status `pending_review` (OK 대기)

점수 요소: 통합 점수, 마진≥15%, MOQ≤1, 정책, 카탈로그 전략, top-seller 전술.  
**데모/API 미연동 시 92% 상한** → certified 안 됨 (의도적).

### 3.2 상세페이지 프로바이더 체인 (`detail-page-providers.ts`)

우선순위 (env 있으면 해당 단계 사용):

1. `DRAPH_API_URL` + `DRAPH_API_KEY` (~800원)
2. `HOOKABLE_API_URL` + `HOOKABLE_API_KEY`
3. `SELLERBISEO_API_URL` + `SELLERBISEO_API_KEY`
4. `matchcut-adapter` — 1688 URL + `OPENAI_API_KEY` → 비전 파이프
5. `openai_premium` — OpenAI chat으로 HTML (~150원) **← 키만 있으면 권장**
6. `hookable_local` — `hookable-detail-engine.ts` 무료 HTML

### 3.3 Pick → Draft → Execute → Fulfillment

```
1. GET /api/toss-shop/consignment  (하루 1회 pick 캐시)
2. POST /api/toss-shop/listings { pickId, mode }  OR  cron autopilot
   → buildListingDraftFromPick → detailPage + pickBrief + adCampaign
3. 사용자: 등록함에서 미리보기 확인
4. POST /api/toss-shop/listings/[id]/execute
   → publishListingToToss (FEP)
   → executeConsignmentOrder (발주 URL/메모만)
5. cron processFulfillmentCycle
   → 토스 PAID 주문 → preparing → wholesale_ready
6. POST /api/toss-shop/fulfillment { jobId, trackingNumber }
   → registerOrderTracking
```

**Execute 구현:** `toss-shop/lib/store.ts` → `executeJarvisListing()`

### 3.4 Cron 60초 (`syncAllMerchants` in store.ts)

매 tick:
1. Toss API merchant sync (키 있을 때)
2. `simulatePriceUpdate` 전 카탈로그 (데모용 분/min)
3. keywordHistory 스냅샷
4. competitor alertRules + **watchlist 알림** (v4)
5. `collectMarketIntelligence`
6. `runJarvisAutopilotCycle` per merchant

**프로덕션:** cron-job.org → `GET https://effiroad.com/api/cron/toss-shop-sync` **60초**  
`vercel.json`의 `0 6 * * *`는 **백업만** — CRON.md 참고.

### 3.5 Coupilot급 시장분석 (`toss-market-engine.ts`)

`runTossDeepAnalysis()`:
- catalog + marketKeywords + (optional) OpenAI 리뷰 인사이트
- wingRatio, adBidEstimate, SERP daily views, opportunityScore
- **라이브 토스 SERP API 없음** — 카탈로그+휴리스틱+OpenAI. UI/API는 Coupilot **패리티 목표**, 데이터는 `dataQuality: live|mixed|demo` 표시.

---

## 4. 환경변수 전체 (Vercel Production)

### vercel.json에 이미 있음 (push만 하면 됨)

```
NEXT_PUBLIC_SELLER_PULSE_AT_ROOT=1
NEXT_PUBLIC_APP_URL=https://effiroad.com
TOSS_SHOP_OWNER_EMAILS=minseongc022@gmail.com
TOSS_SHOP_KRW_PER_USD=1350
TOSS_SHOP_PRO_ACTIVATION_CODE=effiroad-tspro-539d
JARVIS_AUTOPILOT_ENABLED=true
```

### 반드시 Vercel에 수동 추가 (수익·실행에 필수)

| Variable | 용도 |
|----------|------|
| `AUTH_SECRET` | JWT (32+ chars) |
| `CRON_SECRET` | cron-job.org Bearer |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | 스토어 (Vercel KV) |
| `OPENAI_API_KEY` | Premium 상세 + 리뷰 AI **강력 권장** |
| `TOSS_SHOPPING_ACCESS_KEY` + `TOSS_SHOPPING_SECRET_KEY` | 토스 FEP |
| `TOSS_SHOP_DEFAULT_CATEGORY_ID` | 상품 등록 |
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID` | 상품 등록 |
| `DOMEGGOOK_API_KEY` | 도매꾹 실공급가 |

### 선택 (품질 향상)

```
DRAPH_API_URL, DRAPH_API_KEY
HOOKABLE_API_URL, HOOKABLE_API_KEY
JARVIS_OPENAI_MODEL=gpt-4o-mini
TOSS_SHOP_MONTHLY_GOAL_KRW=10000000
JARVIS_AUTO_EXECUTE=true   ← ⚠️ env만 있고 자동 execute 미구현 (§5)
```

### Lemon Squeezy (Pro 결제 — Effiroad 공용)

```
LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, LEMON_SQUEEZY_WEBHOOK_SECRET
LEMON_SQUEEZY_VARIANT_ID_TOSS_SHOP_PRO (optional)
```

**Push 스크립트:**
```bash
# .env.local에 시크릿 넣은 뒤
VERCEL_TOKEN=... VERCEL_PROJECT_ID=... [VERCEL_TEAM_ID=...] \
  node scripts/toss-shop-production-env.mjs
node scripts/jarvis-setup-checklist.mjs
```

---

## 5. 알려진 한계 (사용자에게 거짓말 금지)

| 기능 | 실제 |
|------|------|
| 도매매/도매꾹 **자동 발주 API** | **없음** — URL + 고객정보 메모만 |
| 토스 **광고 API** | 설계 JSON만 |
| `JARVIS_AUTO_EXECUTE=true` | Health에 표시되나 **execute 자동 호출 코드 없음** |
| 토스 **실검색량/SERP** | 공식 API 없음 — 카탈로그+추정+OpenAI |
| Coupilot vs Jarvis | Coupilot=쿠팡 데이터, Jarvis=토스 **실행** |
| Matchcut | 1688+OpenAI 필요; UI 일부 "예정" 문구 잔존 가능 |
| 단일 KV 키 | `toss-shop:store:v1` — 멀티테넌트 스케일 주의 |

---

## 6. 배포·CI

- **main push** → Vercel deploy hook + GitHub Actions
- `scripts/giu-deploy-verify.mjs` — giucuu.com (청크 ID 동적 스캔)
- `scripts/effiroad-deploy-verify.mjs` — Jarvis API 401 + login 200
- 브랜치: `cursor/<name>-539d` (cloud agent)

**검증:**
```bash
npm run build
node scripts/effiroad-deploy-verify.mjs
node scripts/jarvis-setup-checklist.mjs
# 로그인 후
curl -b cookies.txt https://effiroad.com/api/toss-shop/jarvis/health
```

---

## 7. PR 히스토리 (Jarvis 관련)

| PR | 내용 |
|----|------|
| #310–#313 | 93% gate, listing automation, Hookable, autopilot v3 |
| **#314** | v4 market + detail providers |
| **#315** | CI verify fix |

---

## 8. Claude 작업 시 코드 규칙

1. **CRON.md 먼저** — "하루 1번"이라고 말하지 말 것 (toss-shop-sync = 60초)
2. **최소 diff** — Jarvis unrelated 수정 금지
3. **store.ts** — 버그 대부분 여기서 시작
4. **93%** — fake confidence 올리지 말 것; 게이트 로직 존중
5. **Pro gating** — `requireFullAccess()` 패턴 유지
6. 브랜치: `cursor/<descriptive>-539d`

---

## 9. 즉시 실행 체크리스트 (사람+Claude)

```bash
node scripts/jarvis-setup-checklist.mjs
node scripts/effiroad-deploy-verify.mjs
npm run build
npm run check:cron
```

**cron-job.org** (계정 필요):
- URL: `https://effiroad.com/api/cron/toss-shop-sync`
- Interval: **60 seconds**
- Header: `Authorization: Bearer <CRON_SECRET>`

**Vercel Dashboard** → Project → Settings → Environment Variables → Production

**사용자 로그인 테스트** (minseongc022@gmail.com = Owner):
1. `/dashboard` — Command Center Health
2. `/dashboard/keywords?q=방울토마토` — Jarvis 심층 탭
3. `/dashboard/consignment` — Jarvis 등록 준비 → 등록함
4. `/dashboard/listings` — OK · Jarvis 전체 실행

---

## 10. TODO (우선순위)

### P0 — 돈·실행 (시크릿 필요, Claude는 스크립트/문서만)

- [ ] Vercel에 `OPENAI_API_KEY`, Toss API, CATEGORY/RETURN ID, `DOMEGGOOK_API_KEY`, `CRON_SECRET` 추가
- [ ] cron-job.org 60초 등록 확인
- [ ] Owner 계정으로 execute E2E 1회 (토스 샌드박스 가능)

### P1 — 코드 (Claude가 할 수 있음)

- [ ] `JARVIS_AUTO_EXECUTE=true` 일 때 `executeJarvisListing` autopilot 연동 (현재 미구현)
- [ ] Toss 공식 API 나오면 `toss-market-engine` live SERP 교체
- [ ] Draph/Hookable 실 API 스펙 맞추기 (현재 generic POST)
- [ ] E2E test: draft → execute (mock Toss)

### P2 — 수익 최적화

- [ ] Autopilot: certified pick N개/일 (현재 TOP 1)
- [ ] Health score 90%+ 모든 env green 가이드 UI
- [ ] Import pick fulfillment flow

---

## 11. 사용자 컨텍스트 (채팅 약속 요약)

사용자가 원한 것:
- AI 이름 **Jarvis**, Iron Man급 Full Autopilot
- **93%+** real confidence (가짜 X)
- Hookable보다 **싼데 좋은** 상세 → v4에서 OpenAI Premium + Draph API 체인
- **Coupilot보다** 토스에서 돈 벌기 → 실행력 + v4 시장분석
- domeme-first, 월 **1천만**, OK gate 후 등록, 송장 자동
- **effiroad.com** 배포, Pro `effiroad-tspro-539d`

---

## 12. 연락·리포

- GitHub: `minseongc022-create/vowpath`
- Production: https://effiroad.com
- Health (auth): `/api/toss-shop/jarvis/health`
- Deep analysis (auth): `/api/toss-shop/market/deep-analysis?keyword=`

**이 문서 수정 시:** `docs/JARVIS_CLAUDE_HANDOFF.md` + `AGENTS.md` 링크 유지.
