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
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID` | — | 기본 반품지 (아래 매핑이 없으면 필수) |
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP` | — | 공급처별 반품지 JSON — 아래 참조 |
| `TOSS_SHOP_RETURN_LOCATION_STRICT` | `false` | `true` = 매핑에 없는 공급처는 등록 차단 |

### 교환·반품지 — 왜 하나로 고정하면 안 되는가

위탁판매는 공급처마다 반품 처리 방식이 다릅니다.

- **공급처 직접 수거형** — 반품지를 그 공급처 주소로 등록해야 합니다. 셀러 주소로 등록해두면 고객이 셀러에게 보내고 셀러가 다시 공급처로 재발송해야 해서, 왕복 택배비가 건당 그대로 손실입니다.
- **셀러 처리형** — 셀러 주소로 등록해야 합니다. 공급처 주소로 잘못 등록하면 공급처가 수취를 거부하고 반품이 미아가 됩니다 → 분쟁 → 토스 페널티.

게다가 도매꾹/도매매는 **플랫폼 하나에 공급사가 수천 개**라 플랫폼 단위 매핑으로는 반품지를 특정할 수 없습니다. 그래서 `platform:sellerId` 공급처 단위까지 내려갑니다.

```jsonc
// TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP
{
  "domeggook:12345": 678,   // 공급처 단위 — 가장 구체적, 최우선
  "domeggook": 679,         // 플랫폼 단위 — 위 매핑에 없는 도매꾹 공급사
  "mode:import": 680,       // 해외구매대행 전용 국내 반품지
  "mode:consignment": 681   // 위탁 전체 폴백
}
```

**결정 순서** (구체적인 것이 이김): 승인 화면 직접 지정 → `platform:sellerId` → `platform` → `mode:*` → `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID`

**fail-closed 규칙** (`toss-shop/lib/api/exchange-return-location.ts`):

| 상황 | 동작 |
|------|------|
| 매핑 JSON이 깨짐 / ID가 양의 정수가 아님 | **등록 차단** (`MAP_INVALID`). 조용히 기본값으로 넘어가면 셀러가 매핑이 동작한다고 믿는 동안 전 SKU가 틀린 주소로 등록됨 |
| 매핑은 유효한데 이 공급처만 누락 | 기본 반품지로 등록 + **경고 기록**. `STRICT=true`면 차단 (`UNMAPPED`) |
| 기본값·매핑 둘 다 없음 | 등록 차단 (`MISSING`) |
| 수입 건인데 매핑 미설정 | 기본 반품지 + "반품은 해외로 보낼 수 없음" 경고 |

수입(해외구매대행)의 `supplierPlatform`은 국가명(`중국`/`일본`)이라 `country:중국`으로 네임스페이스가 분리됩니다 — 국가는 공급처가 아니고 반품을 해외로 보낼 수 없기 때문입니다.

결정 근거는 초안의 `returnLocation`에 남습니다(`source`, `matchedKey`, `triedKeys`, `warnings`). 반품 사고는 등록 몇 주 뒤에 터지므로 사후 추적이 가능해야 합니다. 설정 상태는 헬스체크 `return_location` 항목에서 확인합니다.

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

---

## 토스쇼핑 위탁 전용 모드 (v2)

### 왜 위탁 전용인가

배송 품질 우수 인센티브의 4조건에 **자체 재고 요건이 없다**:

| 조건 | 위탁으로 가능? |
|---|---|
| 셀러 페널티 0점 | ✅ |
| '오늘 출발' 설정 (상품 단위) | ✅ 설정값 |
| 직전 7영업일 발송 1건 이상 | ✅ |
| 발송기한 준수율 **100%** | ✅ 공급처가 당일 출고하면 |

공급처가 당일발송만 해주면 위탁으로 판매수수료 0%를 그대로 받는다. 같은 8%를 **자본 리스크 없이** 먹을 수 있으므로 수입(선매입)이 위탁보다 나을 구조적 이유가 없다. 수입은 `TOSS_SHOP_IMPORT_SALES_ENABLED=true`로 되살릴 수 있으나, 랜딩코스트 실측(관세·부가세)과 수입 인증 게이트가 선행되어야 한다.

### 수수료 0% 경로는 두 개다 (`fee-model.ts`)

1. **배송 인센티브** — 4조건 충족 시 그 옵션 판매수수료 0%
2. **광고 유입** — 광고 클릭 후 7일 내 판매분 수수료 면제

**둘은 중복되지 않는다.** 이미 인센티브로 0%인 건에 광고를 태우면 면제할 수수료가 없어 광고비가 순수 비용이 된다. `ad-budget-allocator`가 이런 SKU의 배분 비중을 낮춘다.

인센티브 마진은 **공급처가 1등급·당일발송으로 검증된 경우에만** 적용한다. 미검증이면 보수적으로 8%로 계산한다 — 낙관값을 기본으로 두면 마진이 조용히 부풀려진다.

### 공급처 게이트 (`supplier-quality.ts`)

인센티브가 준수율 **100%**를 요구하므로 정상출고율 기준을 `SAME_DAY_MIN_FULFILLMENT_RATE_PCT = 98`로 둔다. 종전 80%는 "5건 중 1건 지연"을 허용해 오늘출발 전략에서 재앙이다. **출고율 미확인도 탈락** — "모르면 통과"는 fail-closed 위반이다.

### 효자상품 판정 (`winner-sku-engine.ts`)

다른 엔진과 달리 **실제 정산 입금액만** 쓴다. 예측은 한 줄도 섞지 않는다.

| 등급 | 조건 | 조치 |
|---|---|---|
| `hero` 효자 | 목표의 5%+ 기여 · 추세 -20% 이상 · 꾸준함 40+ | 광고·재고 최우선 |
| `rising` 육성 | 추세 +25%+ | 소액 증액 |
| `steady` 유지 | — | 가격·구성 실험 |
| `declining` 하락 | 추세 -30% 이하 | 원인 규명 |
| `drain` 정리 | 순익 ≤0 또는 목표 1% 미만 | 광고 중단 |
| `insufficient_data` | 8건 미만 또는 14일 미만 | **판정 보류** |

표본 부족 SKU를 효자로 판정해 광고비를 몰아주는 게 가장 비싼 실수라서 fail-closed로 막는다.

`GET /api/toss-shop/jarvis/winners?budget=30000` — 효자 리포트 + 광고비 배분 계획

### 광고비 배분 (`ad-budget-allocator.ts`)

두 원칙:
1. **실측된 효자에만 태운다** — 예측 점수 높은 SKU에 태우면 예측 오차에 돈을 거는 것
2. **손익분기 CPC를 절대 넘지 않는다** — 예산이 남아도 넘지 않고 `unallocatedKrw`로 남긴다

손익분기 CPC = `판매가 × 8% × 전환율`. 전환율 실측이 없으면 배분을 보류한다.

### 도매처 다중 연동 (`wholesale/adapters/registry.ts`)

소싱처 확대의 실익은 "더 싼 곳"이 아니라 ① 중복도 낮추기 ② 품절 시 대체 공급처 ③ 같은 상품 교차검증이다.

| 플랫폼 | 상태 | 활성화에 필요한 것 |
|---|---|---|
| 도매꾹·도매매 | `live` (키 있을 때) | `DOMEGGOOK_API_KEY` |
| 오너클랜 | `needs_spec` | `OWNERCLAN_API_KEY` + 실응답 필드맵 |
| 온채널 | `needs_spec` | `ONCH_API_KEY` + 실응답 필드맵 |
| 젠트레이드 | `needs_spec` | `ZENTRADE_API_KEY` + 실응답 필드맵 |
| 도매토피아 | `needs_spec` | `DOMETOPIA_API_KEY` + 실응답 필드맵 |

`needs_spec` 어댑터는 `search`가 아예 없어 **검색에 참여하지 않는다.** 추정 데이터를 만들어 채우지 않는다.

활성화 절차 (플랫폼당 30분 수준):
1. 제휴 신청 → API 키 발급
2. **실제 응답 1건을 확보해 `qualityFields`(등급·출고속도·출고율 필드명) 확정**
3. `search()` 구현 → `status`가 `live`로 전환

2번이 핵심이다. 기본 필드맵은 도매꾹 응답 기준이라 다른 플랫폼에 그대로 쓰면 전부 판독 실패 → `verified:false` → 전량 탈락한다. 연동해도 상품이 하나도 안 올라간다.

### 추가 환경변수

| Variable | Default | Notes |
|----------|---------|-------|
| `TOSS_SHOP_DAILY_AD_BUDGET_KRW` | `0` | 일 광고예산 — 효자 우선 배분 |
| `TOSS_SHOP_IMPORT_SALES_ENABLED` | `false` | 수입판매 재활성 (랜딩코스트 실측 선행 필요) |
| `OWNERCLAN_API_KEY` 외 | — | 도매처별 키 (스펙 확보 후 유효) |
