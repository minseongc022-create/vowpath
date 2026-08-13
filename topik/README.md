# TOPIK Master VN — 베트남인 대상 한국어·TOPIK 학습 앱

Effiroad Learn 코드베이스 위에 구축된 **베트남 시장 전용 TOPIK 학습 플랫폼**입니다.

## 시작하기

```bash
npm install
npm run dev
```

브라우저: [http://localhost:3000/topik](http://localhost:3000/topik)

`OPENAI_API_KEY` 설정 시 쓰기·말하기 AI 첨삭이 실제 TOPIK 채점 기준으로 동작합니다. 없으면 demo 모드.

## 핵심 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| **합격 확률 대시보드** | `/topik` | SRS·퀴즈·쓰기·말하기·모의고사 기반 합격 % 예측 |
| **말하기 IBT + AI** | `/topik/speaking` | 베트남인 발음 오류 패턴 교정 + TOPIK IBT 채점 |
| **IBT 모의고사** | `/topik/mock-exam` | 20분 타이머 · 10문항 · 자동 채점 |
| **쓰기 AI 첨삭** | `/topik/writing` | TOPIK 51~54번 답안 채점 + 베트남어 해설 |
| **강의 + 영상** | `/topik/lessons` | YouTube 큐레이션 + 어휘/문법 |
| **문제 연습** | `/topik/practice` | TOPIK 1~6급 퀴즈 |
| **SRS 반복학습** | `/topik/review` | SM-2 간격 반복 알고리즘 |
| **오답노트** | `/topik/wrong-notes` | 틀린 문제 자동 SRS 등록 |

## 경쟁 차별화 (vs Migii / Edmicro)

- **베트남인 특화 발음 교정**: 받침 탈락, ㄱ/ㅋ/ㄲ 혼동, 조사 오류 등 룰 + AI
- **합격 확률 + 일일 학습 계획**: 시험일 설정 → 30/60/90일 로드맵
- **IBT 모의고사**: 타이머 + 점수 기록 + 홈 대시보드 연동

## 구조

```
topik/                    # TOPIK 전용 코드
  lib/speaking/           # 말하기 AI + 베트남 오류 패턴
  lib/mock-exam/          # IBT 모의고사
  lib/analytics/          # 합격 확률
  lib/study-plan/         # 30/60/90일 로드맵
  lib/curriculum/         # TOPIK 1~6급 커리큘럼
  lib/writing/            # AI 첨삭 엔진
  lib/quiz/               # 문제은행
  lib/store/              # SRS + 진도 (file store)
  components/             # UI
app/(topik)/topik/        # App Router
```

## 베트남 UI

모든 사용자-facing 텍스트는 `topik/lib/i18n/vi.ts`에 있습니다.
