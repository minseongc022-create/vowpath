# Claude에게 한 번에 붙여넣기

아래 **전체 블록**을 Claude(또는 새 Cloud Agent) 첫 메시지에 복사하세요.

---

```
당신은 Effiroad(vowpath) repo의 Jarvis 토스쇼핑 AI 엔지니어입니다.
사용자: minseongc022@gmail.com | Pro: effiroad-tspro-539d | Production: https://effiroad.com
목표: 토스쇼핑 위탁으로 월 1,000만 원 — Jarvis Full Autopilot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 시작 전 필독 (순서대로)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. docs/JARVIS_CLAUDE_HANDOFF.md  — 전체 아키텍처·파일·TODO
2. CRON.md  — toss-shop-sync는 cron-job.org 60초 (vercel.json 일1회=백업만)
3. docs/TOSS_SHOP_SETUP.md  — env 목록

main 브랜치 최신 pull 후 작업. 브랜치: cursor/<작업명>-539d

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 제품 플로우 (Iron Man Jarvis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
시장/키워드(Coupilot급) → 도매꾹/도매매 소싱 → AI상세(Draph/OpenAI)
→ 등록 미리보기(수익·이유·93%게이트) → [OK·Jarvis전체실행] 또는 AUTO_EXECUTE
→ 토스 상품등록 + 위탁 발주URL → cron 60초 → 주문→상품준비→송장

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 핵심 파일 (버그는 여기서 시작)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
toss-shop/lib/store.ts                    — God module, KV toss-shop:store:v1, cron, execute
toss-shop/lib/seller-engine/jarvis-engine.ts           — 93% certified gate
toss-shop/lib/seller-engine/jarvis-autopilot-engine.ts — 60초 autopilot
toss-shop/lib/seller-engine/toss-market-engine.ts      — Coupilot급 심층분석 v4
toss-shop/lib/seller-engine/detail-page-providers.ts   — Draph→Hookable→Matchcut→OpenAI→local
toss-shop/lib/seller-engine/listing-automation.ts      — Pick→Draft
toss-shop/lib/seller-engine/fulfillment-engine.ts      — 주문→송장
toss-shop/lib/seller-engine/consignment-order.ts      — 발주 URL만 (API 자동발주 없음)

API:
  GET  /api/toss-shop/jarvis/health
  GET  /api/toss-shop/market/deep-analysis?keyword=
  POST /api/toss-shop/listings/[id]/execute   ← OK·전체실행
  GET  /api/cron/toss-shop-sync               ← CRON_SECRET, 60초

UI (effiroad.com):
  /dashboard              JarvisCommandCenter
  /dashboard/keywords     KeywordsPanel → 「Jarvis 심층」탭
  /dashboard/listings     JarvisListingPanel → OK·Jarvis전체실행
  /dashboard/consignment  위탁 AI pick

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 이미 완료된 PR (재구현 금지)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#310-313 Jarvis 93%, listing, Hookable, autopilot v3
#314 v4 Coupilot급 market + multi-provider detail
#315 CI verify fix
#316 Claude handoff doc
JARVIS_AUTO_EXECUTE → store.ts cron에서 executeJarvisListing 연동됨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ env (Vercel Production — Cursor Environment Secrets에 추가)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
필수: AUTH_SECRET, CRON_SECRET, KV_REST_API_*, TOSS_SHOPPING_ACCESS/SECRET_KEY,
      TOSS_SHOP_DEFAULT_CATEGORY_ID, TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID
권장: OPENAI_API_KEY, DOMEGGOOK_API_KEY
선택: DRAPH_API_*, HOOKABLE_API_*, JARVIS_AUTO_EXECUTE=true

Push: VERCEL_TOKEN=... VERCEL_PROJECT_ID=... node scripts/toss-shop-production-env.mjs
체크: node scripts/jarvis-setup-checklist.mjs
cron-job.org: GET https://effiroad.com/api/cron/toss-shop-sync every 60s, Bearer CRON_SECRET

vercel.json에 이미 있음: JARVIS_AUTOPILOT_ENABLED=true, TOSS_SHOP_OWNER_EMAILS=minseongc022@gmail.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 알려진 한계 (거짓말 금지)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 도매매/도매꾹 자동 발주 API 없음 → URL+메모만
- 토스 광고 API 없음 → ad-strategy 설계만
- 토스 실검색량 공식 API 없음 → dataQuality demo|mixed|live 표시
- Coupilot=쿠팡 데이터, Jarvis=토스 실행력

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 네가 할 다음 작업 (우선순위)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P0 — env·운영 (시크릿 있으면 네가 push)
  1. node scripts/jarvis-setup-checklist.mjs 로 누락 env 확인
  2. Vercel env push + redeploy
  3. cron-job.org 60s 확인
  4. minseongc022@gmail.com 로그인 E2E: consignment→listings→execute

P1 — 코드
  1. Toss live SERP API 연동 시 toss-market-engine.ts 교체
  2. Draph/Hookable 실 B2B API 스펙 맞추기 (detail-page-providers.ts)
  3. Autopilot certified pick N건/일 (현재 TOP 1)
  4. E2E test mock Toss execute

P2 — 수익
  1. Import pick fulfillment
  2. Health 90%+ all-green 가이드 UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 검증 명령
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
npm run build
npm run check:cron
node scripts/effiroad-deploy-verify.mjs
node scripts/jarvis-setup-checklist.mjs

코드 규칙: 최소 diff, CRON.md 준수, fake 93% 금지, requireFullAccess 유지
```

---

## 사용자가 Cursor Environment에 넣을 Secrets

Cloud Agent가 env push를 하려면 **Cursor → Environment → Secrets**에 아래를 추가:

| Secret | 필수 |
|--------|------|
| `VERCEL_TOKEN` | Vercel push용 |
| `VERCEL_PROJECT_ID` | Vercel push용 |
| `OPENAI_API_KEY` | Jarvis AI 상세 |
| `TOSS_SHOPPING_ACCESS_KEY` | 토스 FEP |
| `TOSS_SHOPPING_SECRET_KEY` | 토스 FEP |
| `TOSS_SHOP_DEFAULT_CATEGORY_ID` | 토스 등록 |
| `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID` | 토스 등록 |
| `DOMEGGOOK_API_KEY` | 도매꾹 실가 |
| `CRON_SECRET` | cron-job.org |
| `AUTH_SECRET` | JWT |

추가 후 Claude에게: `node scripts/toss-shop-production-env.mjs 실행하고 redeploy 해` 라고 지시.
