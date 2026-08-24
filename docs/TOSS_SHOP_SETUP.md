# Effiroad 토스쇼핑 셀러 도구 — 설정

## vercel.json (자동 배포됨)

다음은 `vercel.json` → `build.env`에 포함되어 **push to main** 시 자동 적용됩니다.

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SELLER_PULSE_AT_ROOT` | `1` |
| `NEXT_PUBLIC_APP_URL` | `https://effiroad.com` |
| `TOSS_SHOP_OWNER_EMAILS` | `minseongc022@gmail.com` |
| `TOSS_SHOP_KRW_PER_USD` | `1350` |
| `TOSS_SHOP_PRO_ACTIVATION_CODE` | `effiroad-tspro-539d` |

## 도매꾹·도매매 (위탁 실공급가)

위탁 AI v5는 **도매꾹 Open API**로 실시간 공급가를 가져옵니다.

| Variable | Notes |
|----------|-------|
| `DOMEGGOOK_API_KEY` | [openapi.domeggook.com](https://openapi.domeggook.com) 발급 · `getItemList` |

미설정 시: 도매꾹·도매매 **검색 링크 + 시장 기반 추정가**로 동작 (입력 후 정밀도 상승).

## 월 수익 목표 (AI v5 genius)

| Variable | Default |
|----------|---------|
| `TOSS_SHOP_MONTHLY_GOAL_KRW` | `10000000` (월 1,000만 원) |

대시보드·수익 브리핑 API에서 목표 대비 진행률·12주 로드맵·genius 점수를 계산합니다.

## Vercel에 이미 있을 Lemon Squeezy (Effiroad 공용)

토스쇼핑 Pro 결제는 **기존 LS 키**를 재사용합니다. 별도 variant 없으면 `LEMON_SQUEEZY_VARIANT_ID_GIU`로 fallback (custom_price 10,000원).

| Variable | Required |
|----------|----------|
| `LEMON_SQUEEZY_API_KEY` | yes |
| `LEMON_SQUEEZY_STORE_ID` | yes |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | yes |
| `LEMON_SQUEEZY_VARIANT_ID_TOSS_SHOP_PRO` | optional (전용 구독 variant) |
| `LEMON_SQUEEZY_VARIANT_ID_GIU` | fallback checkout |

Webhook: `https://effiroad.com/api/lemon-squeezy/webhook`  
이벤트: `subscription_*`, `order_created` (tossShop custom_data)

## 토스쇼핑 API (본인 스토어 동기화)

셀러센터에서 발급 후 Vercel Production에 추가:

| Variable | Notes |
|----------|-------|
| `TOSS_SHOPPING_ACCESS_KEY` | FEP API |
| `TOSS_SHOPPING_SECRET_KEY` | FEP API |
| `TOSS_SHOPPING_SANDBOX` | `1` = 테스트 |

또는 대시보드 **설정 → API 연동**에서 계정별 저장 (Pro 필요).

## Cron

[cron-job.org](https://cron-job.org) 60초:

`GET https://effiroad.com/api/cron/toss-shop-sync`  
Header: `Authorization: Bearer $CRON_SECRET`

60초 sync에 **Jarvis Autopilot** 포함: 인증 SKU 초안 생성, 토스 주문 감지, 도매매 발주 준비.

## Jarvis Autopilot (v3)

| Variable | Default | Notes |
|----------|---------|-------|
| `JARVIS_AUTOPILOT_ENABLED` | `true` (vercel.json) | 60초 cron에서 autopilot 실행 |
| `JARVIS_AUTO_EXECUTE` | unset | `true` = cron에서 93% 인증 초안 자동 execute |
| `JARVIS_AUTO_EXECUTE_MAX` | `1` | cycle당 자동 execute 최대 건수 (1–5) |
| `JARVIS_AUTOPILOT_MAX_DRAFTS` | `3` | cycle당 자동 초안 최대 건수 (1–10) |
| `JARVIS_MATCHCUT_ENABLED` | `true` | Hookable/Matchcut 상세 |
| `TOSS_SHOP_DEFAULT_CATEGORY_ID` | — | 토스 등록 필수 |
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID` | — | 토스 등록 필수 (기본 반품지) |
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP` | — | 선택 — 공급처별 반품지 오버라이드. JSON, 예: `{"domeggook":123,"1688":456}` (platform key 소문자, `listingPayload.supplierPlatform` 기준). 매핑에 없으면 위 기본값으로 폴백 |

Health check: `GET /api/toss-shop/jarvis/health`  
Autopilot: `GET/POST /api/toss-shop/jarvis/autopilot`  
발주함: `GET /api/toss-shop/fulfillment`  
심층 시장분석: `GET /api/toss-shop/market/deep-analysis?keyword=...`

### AI 상세페이지 프로바이더 (저렴·고품질)

우선순위: Draph API → Hookable API → Matchcut → **OpenAI Premium (~150원)** → 로컬 Hookable

| Variable | Notes |
|----------|-------|
| `DRAPH_API_URL` + `DRAPH_API_KEY` | Draph (~800원/장) B2B |
| `HOOKABLE_API_URL` + `HOOKABLE_API_KEY` | Hookable B2B |
| `SELLERBISEO_API_URL` + `SELLERBISEO_API_KEY` | SellerBiseo |
| `OPENAI_API_KEY` | OpenAI Premium 폴백 (권장) |
| `JARVIS_OPENAI_MODEL` | optional, default `gpt-4o-mini` |

## 스크립트

```bash
# 로컬 env 체크리스트
node scripts/jarvis-setup-checklist.mjs

# Vercel runtime secrets push (토큰 있을 때)
VERCEL_TOKEN=... VERCEL_PROJECT_ID=... node scripts/toss-shop-production-env.mjs

# cron-job.org 60초 잡 등록/갱신 (API 키 있을 때)
CRONJOB_ORG_API_KEY=... CRON_SECRET=... npm run cron:setup

# 전체 인프라 한 번에 (Vercel env + cron + redeploy + verify)
npm run jarvis:infra
```

GitHub Actions: **Jarvis infra bootstrap** (`jarvis-infra-bootstrap.yml`) — `main` push 또는 수동 실행.

**GitHub Secrets (최소):**

| Secret | 필수 | Notes |
|--------|------|-------|
| `CRONJOB_ORG_API_KEY` | yes | cron-job.org API |
| `VERCEL_TOKEN` | yes | env push + CRON_SECRET 자동 조회 |
| `VERCEL_PROJECT_ID` | no | 없으면 API로 vowpath/effiroad 자동 탐색 |
| `CRON_SECRET` | no | 없으면 Vercel에서 읽거나 **자동 rotate** (UI에서 복사 불가해도 OK) |

`CRON_SECRET`을 GitHub에 따로 넣을 필요 없음 — `VERCEL_TOKEN`만 있으면 bootstrap이 Vercel에서 가져옵니다.

```bash
# 배포 검증
node scripts/effiroad-deploy-verify.mjs
```

Claude 인수인계 전체: **[docs/JARVIS_CLAUDE_HANDOFF.md](./JARVIS_CLAUDE_HANDOFF.md)**

## 플랜

| 플랜 | 조건 |
|------|------|
| Owner | `TOSS_SHOP_OWNER_EMAILS` 이메일 |
| Pro | LS 결제 / 활성화 코드 / `subscriptionStatus: active` |
| Free | 하루 키워드 3회 |
