# Pricepulse — 토스쇼핑 가격·순위 인텔리전스

**1층 = 데이터 수집 엔진.** 이 디렉터리에 있는 게 그거다. 2층(대시보드)·3층(리프라이서)은 아직 없다.

> 왜 1층부터인가: 가격·순위 히스토리는 **소급 수집이 불가능**하다. 오늘 안 모으면 오늘 데이터는 영원히 없다.
> 대시보드는 나중에 이틀이면 붙이지만, 3월치 가격 히스토리는 3월에만 모을 수 있다.

---

## 지금 상태 (솔직하게)

| 항목 | 상태 |
|------|------|
| 수집 파이프라인 (fetch → parse → health → store) | ✅ 구현·테스트 완료 (22개 테스트 통과) |
| DB 스키마 + 인덱스 + 대시보드용 뷰 | ✅ `sql/001_init.sql` |
| 파싱 실패 감지 + 알림 | ✅ `lib/parse/search.ts`, `lib/alert.ts` |
| 크론 엔드포인트 (샤딩 + CRON_SECRET) | ✅ `app/api/cron/pricepulse-collect/route.ts` |
| **토스쇼핑 실제 응답 구조** | ❌ **미확인 — 네가 `pricepulse:probe` 한 번 돌려야 함** |

마지막 줄이 중요하다. 이 코드를 작성한 환경에서는 `shopping.toss.im` / `shopping-docs.toss.im`
바깥 네트워크가 차단돼 있어서 실제 페이지를 열어볼 수 없었다. 그래서 **구조를 추측해서 하드코딩하는 대신,
구조를 자동으로 알아내는 도구(probe)를 만들었다.** 네 노트북에서 한 번 돌리면 5분이면 끝난다.

이게 오히려 맞는 설계다. 토스가 응답 구조를 바꿔도 똑같은 명령 한 번이면 되니까 —
파서 코드를 다시 짜는 게 아니라 프로필 JSON을 다시 뽑는 거다.

### 검색으로 확인된 사실 (참고)

- 토스쇼핑 Open API는 **Bearer 인증**, 셀러가 파트너센터 "연동 업체 키"에서 발급.
  단, **토스페이 청약 완료 전에는 키 발급 버튼이 비활성화**다.
- 셀러당 요청 한도: **쓰기 초당 30회 / 읽기 초당 50회**.
- 상품 상세페이지 URL은 파트너센터 상품 옵션별로 복사 가능.

→ 즉 **내 상품 가격 변경(3층 리프라이서 쓰기)** 은 크롤링이 아니라 **셀러가 발급한 Open API 키**로 해야 한다.
공개 검색결과 수집(1층)은 경쟁 상황 관찰용이고, 쓰기는 반드시 셀러 인증 경로로 간다. 이 경계는 절대 흐리지 마라.

---

## 5분 부트스트랩

```bash
# 0) 의존성 (playwright는 이미 devDependency)
npx playwright install chromium

# 1) 토스쇼핑 페이지 구조 자동 분석 → 프로필 제안
npm run pricepulse:probe -- --keyword "무선이어폰"
#    브라우저가 뜨는 걸 직접 보고 싶으면: -- --keyword "무선이어폰" --headed
#    결과: pricepulse/captures/<시각>/  (robots.txt, HTML, 스크린샷, XHR JSON 전부, report.json, profile.proposed.json)

# 2) 제안된 프로필로 캡처를 다시 파싱해서 눈으로 확인
npm run pricepulse:replay -- pricepulse/captures/<시각>/xhr_<...>.json \
  --profile pricepulse/captures/<시각>/profile.proposed.json
#    필드별 커버리지 막대와 상위 5개 상품이 찍힌다. 가격·판매자·리뷰수가 맞으면 성공.

# 3) 확인됐으면 프로필을 확정
cp pricepulse/captures/<시각>/profile.proposed.json pricepulse/config/profile.toss-shopping.json
#    그리고 "status": "verified" 로 바꾼다. (unverified면 수집이 거부된다 — 의도된 안전장치)

# 4) 실제로 안 저장하고 수집만 해보기
npm run pricepulse:collect -- --dry-run --only kw-wireless-earbuds

# 5) DB 준비 (Supabase 프로젝트 하나 새로 파고 SQL 에디터에 붙여넣기)
cat pricepulse/sql/001_init.sql
#    .env.local 에 PRICEPULSE_SUPABASE_URL / PRICEPULSE_SUPABASE_SERVICE_ROLE_KEY

# 6) 진짜 수집
npm run pricepulse:collect
```

`PRICEPULSE_SUPABASE_URL`이 없으면 `pricepulse/data/*.ndjson`에 파일로 쌓인다. 개발 중엔 이게 편하다.

---

## 구조

```
pricepulse/
├─ config/
│  ├─ profile.toss-shopping.json   ← 토스 응답 구조를 아는 유일한 파일 (probe가 생성)
│  ├─ targets.json                 ← 매일 수집할 키워드 목록 (id는 영구 — 시계열의 키다)
│  └─ probe-candidates.json        ← probe가 시도할 검색 URL 후보
├─ lib/
│  ├─ types.ts                     ← 전 계층 공통 타입
│  ├─ normalize.ts                 ← "19,900원" → 19900, KST 일자 계산
│  ├─ profile.ts                   ← 경로 해석(a.b[0].c), 후보 필드 폴백, 스키마 지문
│  ├─ fetch/http.ts                ← 재시도·백오프·레이트리밋·robots.txt
│  ├─ parse/
│  │  ├─ search.ts                 ★ 유일한 파싱 관문 — DB로 가는 모든 행이 여기를 통과
│  │  ├─ discover.ts               ← 모르는 JSON에서 상품 배열·필드를 찾아내는 휴리스틱
│  │  └─ html.ts                   ← __NEXT_DATA__ / flight chunk 등 문서 내장 JSON 추출
│  ├─ collect/run.ts               ← 오케스트레이션 (타깃 → 페이지 → 파싱 → 헬스 → 저장)
│  ├─ store/{index,supabase,file}.ts
│  └─ alert.ts                     ← 실패 알림 (웹훅 1개, 1시간 중복 억제)
├─ sql/001_init.sql
└─ fixtures/                       ← 합성 픽스처 (실제 캡처로 교체할 것)
```

데이터 흐름:

```
targets.json ─┐
              ├→ buildSearchRequest(profile) → fetchWithRetry → parseSearchPayload(profile)
profile.json ─┘                                                        │
                                                                       ▼
                                             evaluateHealth ──(critical)──→ sendAlert, 저장 안 함
                                                       │
                                                     (ok)
                                                       ▼
                                   pricepulse_observations (target, product, KST일자 UNIQUE)
```

---

## "단단함" 3원칙이 코드 어디에 있나

### 1. 크롤러 내구성 — 파싱은 한 곳, 실패는 즉시 알림

- 파싱 로직은 `lib/parse/search.ts` **한 파일**. 응답 모양은 코드가 아니라 `config/profile.*.json`에 있다.
- 필드마다 **후보 경로 목록**을 쓴다(`["salePrice","discountedPrice","price"]`). 토스가 키 하나 바꿔도 안 죽는다.
- **스키마 지문(fingerprint)**: 아이템의 키 경로를 해시해서 매 수집마다 저장한다.
  지문이 바뀌면 *파싱이 아직 성공해도* 경고 알림이 간다. 조용히 망가지기 **전에** 안다.
- **커버리지 하한선**: `externalId` 95%, `name` 95%, `price` 80% 미만이면 critical → **저장하지 않고** 알림.
  0건 수집도 critical이다. "0건"이야말로 망가진 파서의 모습이니까.
- 프로필이 `unverified`면 수집 자체를 거부한다. 쓰레기 데이터가 쌓이는 것보다 빈 게 낫다.
- 모양이 안 맞으면 알림에 **discovery가 찾아낸 새 경로를 같이 적어 보낸다.** 폰으로 알림 보고 바로 뭘 고쳐야 할지 안다.

### 2. 가격 조정 안전장치 (3층 준비)

아직 리프라이서는 없지만, 그때 필요한 토대는 지금 깔아뒀다:

- 가격은 전부 **integer KRW**. `numeric`/float 금지 — 마진 하한선 계산에서 부동소수점 오차는 사고다.
- `pricepulse_observations`는 **(타깃, 상품, KST일자) UNIQUE**. 재시도해도 중복이 아니라 덮어쓰기다.
  "어제 최저가"를 계산할 때 중복 행 때문에 틀리는 일이 없다.
- `pricepulse_target_daily_low` 뷰가 **품절 제외 최저가**를 준다. 리프라이서의 "경쟁 최저가" 입력이 이거다.
- 쓰기(내 상품 가격 변경)는 이 수집기와 **완전히 분리된 경로**(셀러 Open API 키)로 갈 것. 수집 코드에는 쓰기 권한이 없다.

### 3. 운영 제로

- SSH 없음. Vercel(함수) + Supabase(DB) + cron-job.org(스케줄) + 웹훅(알림)이 전부다.
- 크론은 60초 함수 제한을 피하려고 **3샤드**로 나눠 돈다 (`?slice=N&of=3`). `CRON.md` 참고.
- 알림은 웹훅 하나. Slack/Discord/Make→카카오톡 다 JSON POST 받는다.
- 로컬은 DB 없이도 돈다(NDJSON). 서버 안 켜고도 개발·재현 가능.

---

## 운영 런북 (알림 왔을 때)

| 알림 내용 | 의미 | 조치 |
|-----------|------|------|
| `수집 실패 — <키워드>` + HTTP 4xx/5xx | 엔드포인트가 죽었거나 차단 | 하루는 지켜본다. 이틀 연속이면 probe 재실행 |
| `payload shape changed (a → b)` | 토스가 응답 구조 변경. **아직 파싱은 됨** | 여유 있을 때 probe 재실행 → 프로필 갱신 |
| `parsed 0 items` | 파서 깨짐. 데이터 안 쌓이는 중 | 즉시. probe 재실행 → `profile.proposed.json` 확인 → 커밋 → 배포 |
| `low coverage: price 40%` | 가격 필드 이동 | 위와 동일. 이 상태에선 **저장 자체를 안 한다** (오염 방지) |
| `robots.txt disallows ...` | 수집 정책 변경 | 코드로 우회하지 말 것. 정책을 다시 읽고 판단 |
| `수집 전체 실패` | 전 타깃 실패 = 대개 프로필/도메인 문제 | 즉시 |

군대에서 폰으로 할 수 있는 대응은 사실상 "probe 못 돌림"이다. 그래서 **경고(warn) 단계가 존재한다** —
지문이 바뀐 순간 알려주므로, 완전히 깨지기 전 휴가/외박 때 고칠 시간을 번다.

---

## 수집 예절 / 법적 경계

지켜라. 차단당하면 히스토리가 끊기고, 끊긴 히스토리는 복구 불가다.

- **robots.txt 준수가 기본값** (`PRICEPULSE_RESPECT_ROBOTS=1`). `Crawl-delay`가 우리 간격보다 길면 그쪽을 따른다.
- 요청 간격 기본 1.5초, 재시도는 지수 백오프. 429는 `Retry-After`를 존중한다.
- UA에 연락처를 넣는다 (`PRICEPULSE_CONTACT`). 익명 크롤러가 제일 먼저 차단된다.
- **공개 검색결과만** 본다. 로그인 뒤 데이터, 개인정보, 주문 정보는 수집 대상이 아니다.
- 셀러 개인 데이터(내 주문/정산)는 **셀러가 직접 발급한 Open API 키**로만. 수집기와 코드 경로가 다르다.
- 서비스 약관은 바뀐다. 분기마다 한 번은 확인하고, 문제가 되면 공식 API 협의로 전환하는 게 정답이다.

---

## 테스트

```bash
npm run pricepulse:test        # 22개: 파서·발견·robots·헬스·수집 오케스트레이션
npm run pricepulse:typecheck
```

`tests/unit/pricepulse-collect.test.mjs`는 **가짜 토스 서버**(node http)를 띄워서
2페이지 수집 → 중복 제거 → KST 일자 키 → 재실행 시 덮어쓰기 → 500 응답 시 실패 처리 →
robots 차단 시 요청 자체를 안 보내는 것까지 확인한다.

실제 캡처를 손에 넣으면 `pricepulse/fixtures/`의 합성 픽스처를 그걸로 교체해라.
그때부터 이 테스트는 진짜 회귀 테스트가 된다.

---

## 다음 (순서대로)

1. **probe 실행 → 프로필 확정 → 오늘부터 수집 시작.** 이게 1번인 이유는 위에 썼다.
2. 타깃 확장: `config/targets.json`에 키워드 추가. 처음엔 20~30개면 충분하다.
3. 2층 대시보드 3화면 — 쿼리는 이미 준비돼 있다:
   - 순위 추적 → `pricepulse_rank_moves`
   - 가격 히스토리 → `pricepulse_observations` (source, external_id, observed_on)
   - 급상승 → `pricepulse_rank_moves`에서 `rank_delta` 상위
4. 무료 베타 배포 (셀러 카페/오픈채팅). 데이터가 2주치 쌓이면 차트가 설득력을 갖는다.
5. 3층 리프라이서: 규칙 기반 + 제안→승인 모드. 마진 하한선 이중 검증은 그때 별도 모듈로.
