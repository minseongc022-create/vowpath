# 8주 파일럿 1곳 — 실행·판정 기준

> **목표:** 8주 안에 **실제로 전화 forward + 테스트콜까지 끝낸 파일럿 1곳**  
> **성공 정의:** 오너가 after-hours/무응답 전화를 Effiroad로 넘기고, **최소 1건** intake(테스트 포함)가 대시보드에 남음  
> **실패 정의:** 8주 후에도 forward 미완료 shop 0곳 → GTM 또는 offer 변경

기존 리드: `docs/effiroad-pilot-leads.md` · 메시지 템플릿: `docs/cold-outreach.md`

---

## 주간 숫자 (최소 기준)

| 주 | 신규 touch | Follow-up | 누적 신규 touch | 주간 목표 |
|----|------------|-----------|-----------------|-----------|
| 1 | 25 | 0 | 25 | 리스트·메시지 확정, 첫 발송 |
| 2 | 15 | 15 (W1 무응답) | 40 | **첫 답장 1건+** |
| 3 | 15 | 20 | 55 | **통화/Zoom 15분 1건+** |
| 4 | 15 | 25 | 70 | **파일럿 yes 1건+** |
| 5 | 10 | 20 | 80 | **forward + 테스트콜 완료** |
| 6 | 10 | 15 | 90 | live intake 1건 확인 |
| 7 | 10 | 15 | 100 | testimonial/케이스 메모 |
| 8 | 10 | 10 | 110 | 유료 전환 대화 or 2번째 파일럿 |

**Touch 1건 =** SMS 1통, 또는 이메일 1통, 또는 LinkedIn DM 1통, 또는 전화 1회(부재 시 voicemail 1통).

**Follow-up 규칙**

- SMS/이메일 무응답 → **48–72시간 후** 다른 채널로 1회 (같은 채널 3연타 금지)
- 답장 있음 → **24시간 내** 회신
- “관심 있음” → **7일 내** setup 날짜 잡기 (안 잡히면 dead)

**채널 우선순위 (S/A티어)**

1. SMS (전화번호 있는 shop)
2. 전화 → voicemail 20초
3. LinkedIn DM
4. 이메일 (마지막)

---

## 주차별 체크리스트

### Week 1 — 발송

- [ ] S티어 10곳 + A티어 15곳 = 25명 리스트 (이름·전화·pain 리뷰 인용 한 줄)
- [ ] 본인 계정: signup → dashboard → settings 저장 → **테스트콜 1번** (업체 앞에서 말하기 전 필수)
- [ ] 메시지 발송 25건 (월–목, 현지 8–10am)

**Week 1 실패 신호:** 발송 < 20건 → 주말에 5건 더

### Week 2 — 반응

- [ ] W1 무응답 15곳 follow-up (다른 채널)
- [ ] 신규 15곳
- [ ] 답장 온 사람: **15분 통화** 제안 (데모 말고 “setup 10분”)

**Week 2 실패 신호:** 답장 0건 → 메시지 첫 줄을 리뷰 인용으로 바꾸고 S티어만 10건 재발송

### Week 3 — 대화

- [ ] 통화 스크립트: pain 확인 → “30일 무료, 내가 setup, 카드 없음” → **다음 48h 안에 10분 slot**
- [ ] 파일럿 offer 문장 그대로 사용 (`docs/cold-outreach.md` Pilot Offer)

**Week 3 실패 신호:** 답장은 있는데 통화 0 → SMS로 “Tuesday 10am ET 5 min call?” 구체 시간 2개 제시

### Week 4 — 파일럿 yes

- [ ] **yes 1곳** = calendar 잡힘 + shop name + owner mobile
- [ ] onboarding: `docs/onboarding-restoration.md` 체크리스트 print

**Week 4 GO/NO-GO**

| 결과 | 판정 | 다음 행동 |
|------|------|-----------|
| yes ≥ 1 | **GO** | Week 5 setup 집중 |
| 답장 ≥ 3, yes 0 | **YELLOW** | offer를 “내가 직접 forward 설정” 강조, 10곳만 집중 재공략 |
| 답장 ≤ 1 | **RED** | `docs/pilot-8-week-runbook.md` §대안 GTM 검토 (managed service) |

### Week 5 — setup 완료 (가장 중요)

Setup call 10분 순서:

1. Owner signup (화면 공유 or 링크 SMS)
2. Settings: owner mobile, crew 1명, on-call hours
3. Forwarding: carrier code or Effiroad number — **통화 중에 끝**
4. **테스트콜 즉시** — dashboard에 job 보여주기

**Week 5 성공 = forward + 테스트콜 완료** (이게 8주의 진짜 목표)

### Week 6–8 — 증거

- [ ] Live intake 1건 (없으면: “이번 주 storm/비 없음” — owner에게 지인 테스트콜 1번 요청)
- [ ] 한 줄 testimonial 이메일 OK 받기
- [ ] 유료 전환: “한 job $8k, $169/mo” — **Paddle checkout 먼저 고친 뒤** 청구

---

## 8주 최종 판정

| Verdict | 조건 | 확률적 의미 (이전 추정) |
|---------|------|-------------------------|
| **SUCCESS** | forward 완료 shop ≥ 1 + dashboard intake ≥ 1 | 다음 유료 전환 시도 justified |
| **PARTIAL** | yes ≥ 1 but forward 미완 | sales 문제 아님 — onboarding/신뢰 문제 |
| **FAIL** | yes 0 | pure SaaS cold pitch 재시도 ROI 낮음 → managed service pivot |

---

## 실행 KPI (스프레드시트 4열)

| Shop | Last touch | Channel | Status |
|------|------------|---------|--------|
| AquaAssist | 7/14 | SMS | sent |

Status 값: `sent` → `replied` → `call_scheduled` → `pilot_yes` → `live` → `paid` / `dead`

**Dead:** 3회 touch 후 무응답, 또는 “not interested”

---

## 본인 15분 pre-flight (연락 전 1회)

```bash
# 로컬 env 있으면
npm run launch:check
```

Production:

1. https://effiroad.com/signup — 가입·OTP
2. https://effiroad.com/dashboard — 로드
3. Settings — crew/on-call 저장
4. (선택) simulate call / forwarding test

---

## 8주 후 FAIL이면 (같은 제품, 확률 더 높은 GTM)

Pure SaaS self-serve signup pitch 대신:

**“Managed after-hours line — $299/mo, I configure everything, you only forward.”**

- 같은 Effiroad 코드베이스
- 고객은 software가 아니라 **당신**을 삼 → 신뢰 장벽 ↓
- 첫 $ 수령까지 기간 ↓

자세한 대안 순위: founder에게 전달한 `pilot-8-week-runbook` §사업 대안 (README 링크는 AGENTS.md).
