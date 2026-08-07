import { log } from "../lib/utils.ts";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatJson<T>(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<T> {
  const text = await chatText({
    system: `${args.system}\n\nRespond with valid JSON only. No markdown fences.`,
    user: args.user,
    temperature: args.temperature ?? 0.4,
  });
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function chatText(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  if (useMock()) {
    return mockResponse(args.system, args.user);
  }

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY missing. Set it or MOCK_LLM=1 for offline mode.");
  }

  const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "gpt-4.1-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: args.temperature ?? 0.5,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  return content;
}

function useMock(): boolean {
  return process.env.MOCK_LLM === "1" || !process.env.LLM_API_KEY;
}

function mockResponse(system: string, user: string): string {
  log("info", "Using MOCK_LLM writer");
  const brandHint = detectBrandHint(user);

  if (system.includes("humanize") || /humanize this draft/i.test(user)) {
    const start = user.indexOf("```");
    if (start >= 0) {
      const after = user.slice(start + 3).replace(/^\n/, "");
      const end = after.lastIndexOf("```");
      return (end >= 0 ? after.slice(0, end) : after).trim();
    }
    return user;
  }

  if (system.includes("long-form article") || user.includes("Write the full article")) {
    const title = extractTitle(user) || mockTopics(brandHint)[0].titleAngle;
    return buildMockArticle(brandHint, title);
  }

  if (system.includes("topic selector") || (user.includes("seedQueries") && !user.includes("Write the full article"))) {
    return JSON.stringify({ candidates: mockTopics(brandHint) });
  }

  if (system.includes("research brief") || (user.includes("ResearchBrief") && !user.includes("Write the full article"))) {
    return JSON.stringify(mockResearch(brandHint));
  }

  return JSON.stringify({ ok: true });
}

function detectBrandHint(user: string): "finance" | "career" | "tech" {
  if (/career|업무|우선순위|회의|일잘러/i.test(user)) return "career";
  if (/tech|API|데이터베이스|개발|기술번역/i.test(user)) return "tech";
  return "finance";
}

function mockTopics(kind: "finance" | "career" | "tech") {
  if (kind === "career") {
    return [
      {
        titleAngle: "야근이 줄지 않는 진짜 이유: 우선순위 운영체제가 없어서다",
        searchIntent: "업무 우선순위 정하는 법",
        pillar: "우선순위",
        hook: "할 일이 많아서가 아니라, 결정 규칙이 없어서 바쁜 것이다",
        whyNow: "미팅과 슬랙이 늘수록 임의 우선순위가 성과를 깎는다",
        outlinePromise: ["잘못된 바쁨", "우선순위 규칙", "예시", "체크리스트", "착각"],
        score: 0.9,
      },
    ];
  }
  if (kind === "tech") {
    return [
      {
        titleAngle: "API를 '연결선'으로만 이해하면 사고 치는 이유",
        searchIntent: "API가 뭔지 쉽게",
        pillar: "API",
        hook: "API는 문이 아니라 계약이다",
        whyNow: "노코드·외부 연동이 늘면서 계약 개념이 더 중요해졌다",
        outlinePromise: ["정의", "비유", "실패 사례", "체크리스트", "다음에 볼 개념"],
        score: 0.9,
      },
    ];
  }
  return [
    {
      titleAngle: "월급 300에서 자산 구조를 바꾸려면 먼저 끊어야 할 3가지 현금 구멍",
      searchIntent: "월급만으로 자산 모으는 현실적인 방법",
      pillar: "월급 관리",
      hook: "아끼는 게 문제가 아니라, 새는 구조가 문제다",
      whyNow: "아끼기만으로는 한계를 느끼는 직장인이 늘었다",
      outlinePromise: ["현금 구멍", "자동이체", "체크리스트", "착각", "30일 실행안"],
      score: 0.91,
    },
    {
      titleAngle: "부업보다 먼저: 통장 3개로 만드는 월급 방어 시스템",
      searchIntent: "통장 쪼개기 월급 관리",
      pillar: "현금흐름",
      hook: "부업 전에 누수부터 막아라",
      whyNow: "지출 구조 개선이 체감이 빠르다",
      outlinePromise: ["왜 분리", "3통장", "자동이체", "실패 사례", "템플릿"],
      score: 0.86,
    },
  ];
}

function mockResearch(kind: "finance" | "career" | "tech") {
  if (kind === "career") {
    return {
      keyFacts: ["우선순위 없는 할일 목록은 불안만 키운다", "WIP 제한이 처리량을 올린다", "문서화는 미래 시간 구매다"],
      readerPain: ["하루 종일 바쁜데 성과가 안 보인다", "회의 후 할 일이 늘어난다"],
      uniqueAngles: ["바쁨 ≠ 성과", "우선순위를 감정이 아니라 규칙으로"],
      actionFramework: ["오늘 MIT 3개", "WIP 3개 제한", "회의 전 목적 한 줄", "주간 회고 20분"],
      sourcesNote: "일반 업무설계 원칙.",
    };
  }
  if (kind === "tech") {
    return {
      keyFacts: ["API는 인터페이스 계약이다", "버전/인증/에러 규약이 핵심이다", "문서 없는 API는 비용이다"],
      readerPain: ["용어는 아는데 설명 못 한다", "연동 사고가 무섭다"],
      uniqueAngles: ["문이 아니라 계약", "기획자도 읽을 수 있는 계약 체크"],
      actionFramework: ["입력/출력 정의", "에러 케이스 3개", "인증 방식 확인", "타임아웃 합의"],
      sourcesNote: "일반 소프트웨어 기초.",
    };
  }
  return {
    keyFacts: [
      "고정비·변동비를 분리하지 않으면 저축이 의지에 의존한다",
      "자동이체는 의사결정 피로를 줄인다",
      "비상금 없이 투자하면 생활비 쇼크로 손실 확정 매도가 나온다",
    ],
    readerPain: ["매달 아끼는데 잔액이 안 남는다", "부업을 해도 통장이 그대로다"],
    uniqueAngles: ["절약이 아니라 구멍 차단", "부업 전 누수 ROI"],
    actionFramework: ["지출 3분류", "자동이체 고정", "변동비 계좌 분리", "주 1회 점검"],
    sourcesNote: "일반 개인재무 원칙. 개별 투자 권유 아님.",
  };
}

function extractTitle(user: string): string {
  const m = user.match(/titleAngle":\s*"([^"]+)"/) || user.match(/Title:\s*(.+)/);
  return m?.[1]?.trim() || "월급 구조를 바꾸는 실전 가이드";
}

function buildMockArticle(kind: "finance" | "career" | "tech", title: string): string {
  if (kind === "career") {
    return `# ${title}

바쁜데 성과가 없다면, 보통 능력이 부족해서가 아니다. **우선순위 운영체제**가 없는 것이다. 야근은 미덕이 아니라, 결정 규칙이 없다는 신호에 가깝다.

## 잘못된 바쁨

슬랙에 반응하고, 급한 요청을 받고, 회의를 이어가다 보면 하루가 끝난다. 예를 들어 오전 MIT(가장 중요한 일)를 정하지 않으면, 타인 일정표로 하루가 채워진다. 실제로 같은 8시간이라도 반응 모드와 제작 모드의 결과물은 완전히 다르다.

## 규칙으로 바꾸는 우선순위

핵심은 감정이 아니라 규칙이다.
1. 하루 MIT 3개만 적는다.
2. WIP(진행중) 작업을 3개로 제한한다.
3. 회의 전 목적 한 줄을 강제한다.
4. 금요일 20분 회고로 버려야 할 일을 지운다.

가령 WIP를 제한하면 "나중에 할게"가 쌓이지 않고, 끝나는 일의 개수가 보이기 시작한다.

## 착각

"멀티태스킹이 일잘러"라는 착각이 일을 망친다. 반대로, 끝나는 일을 줄여야 처리량이 오른다. 프레임을 바꾸면 업무 자동화나 문서화도 의미를 갖는다.

## 실전 예시

보고 자료 요청이 오면 바로 만들지 말고, "결정에 필요한 질문 3개"를 먼저 돌린다. 실제로 이 한 단계가 재작업을 절반으로 줄인다. 예를 들어 지표 정의가 안 된 채로 대시보드를 만들면, 숫자는 예쁜데 결정은 못 한다.

## 다음 주 체크리스트

- 캘린더에 MIT 블록 90분
- WIP 보드 만들기
- 반복 질문을 문서화
- 거절 문장 템플릿 준비
- 회의 목적 한 줄 템플릿 고정

우선순위 운영체제가 생기면, 야근을 줄이는 건 의지 문제가 아니라 시스템 문제가 된다.

바쁨을 자랑하지 말고, 끝나는 일을 설계하라. 그 전환이 일잘러 시스템의 출발점이다. 회의·슬랙·요청이 늘어날수록, 규칙 없는 사람은 더 바빠지고 규칙 있는 사람은 더 선명해진다. 오늘 MIT 3개만 적어도 내주 야근 패턴이 달라지기 시작한다.
`;
  }

  if (kind === "tech") {
    return `# ${title}

API를 단순히 "연결선"으로 이해하면 사고가 난다. API의 본질은 **계약**이다. 기술해설에서 가장 먼저 잡아야 할 개념이기도 하다.

## 정의

API는 어떤 입력을 주면 어떤 출력이 나오는지, 실패하면 어떻게 알려주는지를 약속한 인터페이스다. 데이터베이스 앞단이든 외부 결제든 

## 비유

식당 주문이 API라면, 메뉴판이 문서고, "품절"이 에러 코드다. 예를 들어 결제 API에 금액·통화·주문ID가 빠지면 서버는 200이 아니라 400으로 거절해야 한다. 실제로 이 계약을 문서에 안 쓰면 프론트와 백엔드가 서로 다른 가정을 한다.

## 실패 사례

타임아웃 합의 없이 외부 API를 붙이면, 화면은 하얗게 멈추고 사용자는 버튼을 여러 번 누른다. 핵심은 연동이 아니라 실패 규약이다. 가령 재시도 정책이 없으면 중복 결제가 날 수 있다.

## 기획자용 체크리스트

1. 입력 필드 정의
2. 성공 응답 예시
3. 에러 케이스 3개
4. 인증 방식
5. 재시도/타임아웃

## 착각

"문서보다 일단 붙이면 된다"는 착각이다. 반대로, 짧은 계약 문서가 개발 속도를 올린다. 프레임을 계약으로 잡으면 보안 기초와 성능 이야기도 자연스럽게 이어진다.

## 다음에 볼 개념

인증(JWT), 멱등성, 레이트 리밋. 이 세 가지를 이해하면 연동 사고의 절반이 줄어든다. API는 연결선이 아니라, 팀이 같이 지키는 약속이다.

노코드 도구가 늘수록 이 계약 감각은 더 중요해진다. 버튼을 누르면 뭔가 연결되는 것처럼 보여도, 뒤에서 깨지는 건 항상 입력·에러·타임아웃 같은 세부 약속이다. 기술번역기의 목표는 용어 암기가 아니라, 사고가 나기 전에 계약을 읽게 만드는 것이다.
`;
  }

  return `# ${title}

월급이 부족한 게 아니라, 월급이 **머물 자리**가 없는 경우가 많다. 이번 글은 투자 팁 나열이 아니다. 돈이 새는 구조를 끊고, 자동으로 남게 만드는 방법에 집중한다. 부업 광고보다 먼저 읽어야 할 현금흐름 메모라고 보면 된다.

## 왜 '아끼자'는 작심삼일이 되나

의지로 아끼는 방식은 피곤하다. 퇴근 후 판단력이 떨어지면 배달·구독·충동구매가 다시 열린다. 문제는 성격이 아니라 기본값이 잘못돼 있다는 점이다.

예를 들어 급여가 한 통장에 들어오면, 그 통장은 동시에 생활비·저축·충동구매 지갑이 된다. 경계가 없으니 잔액이 '써도 되는 돈'처럼 보인다. 실제로 같은 월급을 받아도 통장 구조가 다른 두 사람은 한 달 뒤 잔액 차이가 크게 벌어진다.

## 현금 구멍 3가지

1. **날짜 없는 저축** — "남는 돈 저축"은 보통 안 남는다.
2. **구독 방치** — 소액이 여러 개면 체감이 없다.
3. **비상금 없는 투자** — 생활비 위기가 오면 손실을 확정한다.

각각은 작아 보이지만, 월급의 10~20%를 조용히 가져간다. 가령 월 8만 원짜리 구독 4개면 이미 32만 원이다. 연으로 환산하면 거의 작은 여행비다.

## 통장 3개로 막는 구조

- **급여 통장**: 입금만. 카드 연결 최소화.
- **생활비 통장**: 이번 달 써도 되는 금액만 이체.
- **보관 통장**: 저축/투자 대기. 카드 없음.

핵심은 순서를 바꾸는 것이다. 쓰고 남은 돈을 모으지 말고, **먼저 옮긴 뒤 나머지로 산다.** 이 한 줄이 월급 관리의 전부라고 해도 과하지 않다.

## 30일 실험 체크리스트

1. 지난달 카드 내역을 고정/변동/충동으로 나눈다.
2. 생활비 한도를 보수적으로 정한다. (처음엔 타이트하게)
3. 급여일+1에 보관 통장 자동이체를 건다.
4. 구독 목록을 한 페이지로 적어 해지 후보를 고른다.
5. 주말 15분, 잔액이 아니라 **이체 실행 여부**만 점검한다.

이 실험의 목표는 '완벽 예산'이 아니다. **새지 않는 기본값**이 작동하는지 확인하는 것이다.

## 자주 하는 착각

"금액을 크게 아껴야 의미가 있다"는 착각이다. 먼저 필요한 건 큰 한 방이 아니라, 반복되는 누수를 막는 장치다. 기본값이 바뀌면 부업·이직·투자의 효과가 증폭된다. 기본값이 그대로면 소득이 늘어도 생활비만 커진다. 프레임을 바꾸면, 같은 월급도 다르게 행동한다.

## 다음에 할 일

오늘 할 일은 거창한 재무설계가 아니다. 급여 통장에서 생활비 통장으로 이체 규칙을 하나 만드는 것. 그다음 구독 하나 해지. 그다음 주간 점검 알람. 이 세 가지가 한 달만 유지돼도, 잔액 감각이 바뀐다.

이 글은 개별 투자 권유가 아니다. 현금흐름 구조를 먼저 세우라는 실무 메모에 가깝다. 구조가 먼저고, 수익률은 나중이다. 월급 관리를 감정에서 시스템으로 옮기는 순간, 부업 전에 할 일이 선명해진다.
`;
}
