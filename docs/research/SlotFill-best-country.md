# SlotFill: 한국보다 나은 나라는?

**결론 한 줄:** 사업 경제학만 보면 **미국(1순위)**. 영어·규제·경쟁이 부담이면 **호주(2순위)**. 한국은 “내가 말하기 쉽다”는 장점만 세고, **객단가·노쇼 손실·SaaS 지불 습관**에서는 밀린다.

---

## 1. 비교표 (SlotFill 기준)

| 기준 | 한국 | **미국** | 호주 | 캐나다 | 영국 |
|------|------|----------|------|--------|------|
| 데스크 인건비 | 상대적 낮음 | **높음** (~$20/hr 치과 리셉션 BLS) | **높음** (~A$27/hr) | 높음 (~C$23/hr) | 중 |
| 노쇼 1건 손실 | ~8–12만 원대 언급 흔함 | **$150–400+** / 연간 수억 원 체감 가능 | 높음(민간 치과 수가) | CAD $180–600 슬롯 | 중~고(민간) |
| 노쇼율 신호 | APAC 상대적 낮다는 집계 있음 | **북미 ~12–18%** 흔함 | ~14%대 언급 | 북미와 유사 | UK 치과 높다는 보고 있음 |
| SaaS 월 지불 | 알림톡/리마인더 경쟁·저가 | **환자통신 애드온 $150–400+/mo** 이미 지출 | 영어 SaaS 익숙 | 미국과 유사 | NHS/민간 혼재 |
| 시장 규모 | 작음 | **최대** (치과 오피스 수만~10만+) | 수천 클리닉 | 중 | 중 |
| 경쟁 | 카카오·덴트웹·Keeper·알림톡 구축 흔함 | Weave/Solutionreach/NexHealth **강함** | 상대적으로 덜 붐빔 | 미국 벤더 유입 | 중 |
| 규제 | 개인정보·스팸 | **TCPA + 10DLC + HIPAA/BAA** | Spam Act | CASL | PECR/UK GDPR |
| 솔로 진입 | 언어·콜드콜 쉬움 | 영어·컴플라이언스 숙제 | 영어, 시차 한국 친화 | 영어 | 영어 |

**미국이 한국을 이기는 핵심 3개**
1. **같은 AI 직원 → 더 비싼 사람 대체** (인건비 앵커)
2. **같은 노쇼 1건 → 더 큰 달러 손실** → $149 설득이 쉽다
3. **이미 소프트웨어에 돈을 내는 습관** (PMS + patient communication stack)

**한국이 불리한 점 (정직히)**
- 리마인더·알림톡 시장이 이미 Crowded하고 가격 하방 압력
- 노쇼 절대 금액·SaaS ARPU가 미국보다 낮아 **월 ₩1,000만 = 고객 수 더 많이** 필요
- “확정 문자”만으로는 차별이 어렵고, waitlist까지 가야 하는데 한국도 동일

---

## 2. 추천: **미국** (본선)

### 왜 미국인가
- 독립 치과 front desk가 **확정 콜/문자 + 취소 메우기**를 실제로 함 (기존 JTBD)
- ADA 쪽 설문에서도 노쇼·늦은 취소가 스케줄 미달의 주요 요인으로 자주 꼽힘
- 클리닉이 이미 Weave류에 **월 수백 달러**를 씀 → SlotFill $149는 “추가 AI 직원”으로 포지션 가능
- Stripe·영어 랜딩·원격 데모가 표준

### 미국에서의 리스크 (과소평가 금지)
1. **경쟁:** 리마인더만 하면 Weave 등에 짐. **반드시 waitlist fill + 음성 확정**이 쐐기
2. **TCPA / 10DLC:** 자동 문자·콜 = 동의·옵트아웃·캐리어 등록 필수
3. **HIPAA:** 치과 환자 통신이면 벤더 **BAA** 준비 (Twilio 등 BAA 가능 스택)
4. 한국에서 미국 콜드콜 시차: 한국 저녁 = 미국 아침(동부) 활용

### 미국 ICP (첫 90일)
- **1–3 operatory 독립 general dentist** (DSO·체인 제외)
- 주: 먼저 **Texas, Florida, Arizona, North Carolina, Georgia** (콜드콜 친화·독립 클리닉 많음, CA/NY는 나중에)
- Office manager / front desk lead가 의사결정에 강하게 관여

---

## 3. 미국에서 뭘 해야 하나 (실행 순서)

### Week 0 — 법적·인프라 (팔기 전)
1. 미국 사업용 법인/ Stripe Atlas 또는 기존 법인 + **USD 결제**
2. 전화/문자: Twilio(또는 유사) **A2P 10DLC 브랜드 등록** 시작 (며칠~수주)
3. HIPAA: BAA 맺을 수 있는 벤더만 사용, PHI는 문자에 최소 (“Tomorrow 2pm appt, Reply C to confirm”)
4. 랜딩 1페이지 영어: “Fill cancelled chairs automatically” — AI 자랑 금지
5. 동의 문구 템플릿 (클리닉 intake에 붙일 consent 문장) 준비

### Week 1 — 리스트 100개
| 소스 | 방법 |
|------|------|
| Google Maps | `dentist` + 도시 (Austin, Dallas, Tampa, Phoenix…) |
| 필터 | 리뷰 40–400, **단일 로케이션**, 웹사이트에 “Meet the doctor” 개인클리닉 |
| 기록 | Name, Phone, Website, City, PMS 추정, Call result |

Yelp/Healthgrades 보조. Facebook 광고는 아직 금지.

### Week 2 — 콜드콜 40통 (인터뷰만)
**누구에게:** “Hi, may I speak with the office manager?”  
안 되면 front desk에게 2분 질문.

**오프닝:**
> “Not selling today — researching how offices confirm appointments and fill last-minute cancellations. Two minutes?”

**질문 5개 (한국과 동일 구조):**
1. Who confirms appointments — call, text, or software?
2. Roughly how many no-shows + same-day cancels last month?
3. When a slot opens, do you call a waitlist?
4. What do you pay now for reminders (Weave etc.) if anything?
5. If software filled 2–4 cancelled chairs a month for $149, would you trial?

**통과:** 유료 의향 8+/40, waitlist를 사람이 하는 곳 다수 → 파일럿  
**실패:** “Weave가 다 함”만 나오면 → 포지션을 **waitlist voice fill**로 더 좁히거나 **호주**로 피봇 검토

### Week 3–4 — 수동 파일럿 5클리닉
- Google Calendar 또는 CSV export만으로 시작 (Dentrix 딥연동 금지)
- 확정 SMS + 미응답 시 음성 / 취소 시 waitlist 텍스트
- 성공 KPI: **2주에 filled chairs ≥ 2** 또는 확정률 체감
- 끝나면 **카드 $149** 요청 (친구 가격 금지)

### Month 2–3 — 제품화
- 캘린더 연동, 대시보드(filled slots, estimated $ recovered)
- 음성은 분/콜 캡
- Office manager Facebook 그룹은 **판매 글 금지**, 숫자 케이스만 DM
- 목표: paying **10 → 30**

### 미국에서 하지 말 것
- 처음부터 Dentrix/Open Dental 풀 연동
- 보험 eligibility
- “AI receptionist 전체”로 포지션 (경쟁 9/10 전쟁터)
- 한국 가격(₩10만)으로 미국 판매 (앵커 파괴)

---

## 4. 2순위: **호주** (미국이 너무 빡세면)

### 왜 대안인가
- 데스크 시급 **미국과 비슷하거나 더 높은 구간** (PayScale dental receptionist ~A$27/hr)
- 영어, 민간 치과 수가 높아 노쇼 1건 손실 큼
- Weave급 포화도가 미국보다 낮을 가능성
- 한국과의 시차: 낮에 콜하기 상대적으로 수월

### 호주에서 할 일
1. Google Maps `dentist Sydney` / `Melbourne` / `Brisbane` 독립 클리닉 50곳
2. 동일 5질문 콜드콜 (호주 비즈니스 예절: 짧고 직접적)
3. SMS: Australia Spam Act — 동의·수신거부·발신자 표기
4. 가격: **A$129–249/mo** 테스트
5. 유료 5곳 나오면 미국과 메시지 공유, 인프라는 영어권 공용

시장 절대 크기는 미국보다 작다 → **본선은 미국, 호주는 검증·현금 흐름용 비치헤드**.

---

## 5. 한국은?

- **완전히 버리라는 뜻은 아님.** 언어·도보 영업·카카오는 학습용.
- 다만 **본진 매출·객단가 목표(월 ₩1,000만 @ 50–100계정)** 를 노리면 미국이 유리.
- 한국은 “내가 말 통하는 파일럿 3곳” 정도로만 쓰고, **가격·카피·KPI 학습 후 미국 이관**이 합리적.

---

## 6. 최종 결정

| 순위 | 국가 | 역할 |
|------|------|------|
| **1** | **미국** | SlotFill 본진. 독립 치과 → waitlist fill 쐐기 |
| **2** | **호주** | 영어 비치헤드 / 미국 컴플라이언스 부담 시 |
| 3 | 캐나다 | 미국 성공 후 확장 |
| — | 한국 | 학습·소수 파일럿만, 본진 아님 |

**지금 할 일 한 줄:**  
미국 남부/선벨트 독립 치과 Google Maps **100개 리스트** 만들고, office manager에게 **확정·대기열·Weave 지출** 5질문 콜드콜 40통.
