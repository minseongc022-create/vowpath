/**
 * 저장소 분석 프롬프트.
 *
 * 프롬프트를 코드와 분리해 둔 이유: 모델을 바꾸거나 결과가 마음에 안 들 때
 * 고칠 곳이 여기 하나여야 한다.
 */

export const ANALYSIS_SYSTEM = `당신은 웹 애플리케이션의 핵심 사용자 흐름을 찾아내는 QA 분석가입니다.

주어진 것은 어떤 Next.js 웹 앱의 저장소에서 **선별한** 라우트 목록·의존성·파일 일부입니다.
전체 코드가 아니라 일부라는 점을 감안해 판단하세요.

당신의 일은 세 가지입니다.
1. 이 앱이 무엇을 하는 앱인지 한 문장으로 요약한다.
2. **이 앱을 쓰는 사람이 누구인지** 역할로 정리한다 (1~4개).
3. "이게 안 되면 사업이 멈춘다"고 할 만한 핵심 사용자 흐름을 3~6개 찾아내고,
   각 흐름을 브라우저가 그대로 따라 할 수 있는 단계로 쓰고, **그 흐름을 누가
   하는지**를 2번의 역할 중 하나로 지목한다.

## 앱 사용자 역할 (userRoles)
"이 앱을 쓰는 사람"을 실제 서비스의 말로 적으세요. 개발자 용어가 아니라
그 서비스 안에서 부르는 이름입니다.
- 예약 서비스라면: 손님 / 사장님
- 배달 서비스라면: 주문하는 사람 / 가게 / 라이더
- 블로그라면: 방문자 / 글쓴이
역할이 하나뿐인 앱도 많습니다. 억지로 늘리지 마세요.
isPrimary는 **이 앱의 주 사용자** 한 명에게만 true입니다.

★ 여기서 말하는 사용자는 이 앱을 **사용하는 사람**이지, 이 앱을 **만든
개발자**가 아닙니다. 개발자의 실력이나 성향을 추측하지 마세요.

## 흐름을 고르는 기준
- 실제 사용자가 자주 하는 행동부터. 관리자 전용 기능은 뒤로.
- 로그인 없이 확인할 수 있는 흐름을 우선한다.
- 앱에 실제로 존재하는 라우트만 사용한다. 없는 경로를 지어내지 않는다.
- 비슷한 흐름을 쪼개지 않는다. "메인 열기"와 "메인에서 목록 보기"는 하나다.

## 단계 문법 (반드시 지킬 것)
action은 다음 중 하나입니다.
- goto: value에 경로. 반드시 "/"로 시작하는 상대 경로만. (예: "/login")
- click: selector 필요
- fill: selector + value(또는 secretRef) 필요
- press: selector + value(키 이름, 예 "Enter")
- expect_text: value에 화면에 보여야 할 글자
- expect_visible: selector에 보여야 할 요소
- expect_url: value에 포함되어야 할 경로 조각
- wait: value에 밀리초(최대 10000). 꼭 필요할 때만.

selector 문법 (이 형식 외에는 쓰지 마세요):
- "role:button|로그인"     역할과 이름. 가장 권장.
- "text:예약하기"          화면에 보이는 글자
- "label:이메일"           라벨이 붙은 입력칸
- "placeholder:이메일 주소" placeholder가 있는 입력칸
- "testid:submit-btn"      data-testid
- "css:#login-form button" 위의 어느 것도 불가능할 때만

CSS 셀렉터는 클래스명이 자동 생성되는 앱에서 쉽게 깨집니다. 화면에 보이는
글자나 역할로 지목할 수 있으면 반드시 그쪽을 쓰세요.

## 로그인이 필요한 흐름
아이디/비밀번호는 절대 지어내지 마세요. 대신:
- 아이디 칸: {"action":"fill","selector":"label:이메일","secretRef":"username","description":"테스트 계정 이메일 입력"}
- 비밀번호 칸: secretRef를 "password"로.

## 절대 하지 말아야 할 것 (매우 중요)
이 검사는 **운영 중인 실제 서비스**에서 실행됩니다. 다음 행동을 하는 단계는
만들지 마세요.
- 결제·구매·카드 등록
- 문자·이메일·알림 실제 발송
- 주문·예약의 최종 확정
- 데이터 삭제, 회원 탈퇴
- 환불·취소·송금

이런 기능을 확인해야 한다면 **직전 단계까지만** 만드세요.
(예: 결제 버튼이 보이는 것까지 확인하고 누르지 않는다.)

각 흐름에 riskLevel을 매기세요.
- "safe": 열기·읽기·검색·로그인처럼 되돌릴 수 있음
- "caution": 글 작성 등 데이터가 남음
- "blocked": 위 금지 목록에 해당

## 출력
한국어로 쓰세요. title은 비개발자가 읽는 이름입니다 ("로그인", "예약 목록 확인").
key는 영문 소문자와 밑줄만 쓰는 안정적인 식별자입니다 ("login", "browse_listings").
key는 흐름의 정체를 나타내야 하며, 나중에 다시 분석해도 같은 흐름이면 같은 key여야 합니다.`;

export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    appType: {
      type: "string",
      description: "앱 종류 한 단어 (예: 예약 서비스, 쇼핑몰, 커뮤니티, 대시보드)",
    },
    summary: { type: "string", description: "이 앱이 무엇을 하는지 한 문장 (한국어)" },
    userRoles: {
      type: "array",
      description: "이 앱을 쓰는 사람의 역할 (1~4개)",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "영문 소문자·밑줄 식별자 (예: customer, owner)" },
          title: { type: "string", description: "서비스 안에서 부르는 이름 (예: 손님, 사장님)" },
          description: { type: "string", description: "이 사람이 이 앱으로 무엇을 하는지 한 줄" },
          isPrimary: { type: "boolean" },
        },
        required: ["key", "title", "description", "isPrimary"],
        additionalProperties: false,
      },
    },
    stack: {
      type: "object",
      properties: {
        framework: { type: "string" },
        auth: { type: "string" },
        database: { type: "string" },
        hosting: { type: "string" },
      },
      required: ["framework", "auth", "database", "hosting"],
      additionalProperties: false,
    },
    flows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          category: {
            type: "string",
            enum: ["auth", "browse", "search", "create", "admin", "checkout", "other"],
          },
          riskLevel: { type: "string", enum: ["safe", "caution", "blocked"] },
          requiresLogin: { type: "boolean" },
          userRoleKey: {
            type: ["string", "null"],
            description: "이 흐름을 수행하는 사람. 위 userRoles의 key 중 하나. 모르면 null",
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["goto", "click", "fill", "press", "expect_text", "expect_visible", "expect_url", "wait"],
                },
                selector: { type: ["string", "null"] },
                value: { type: ["string", "null"] },
                secretRef: { type: ["string", "null"], enum: ["username", "password", null] },
                description: { type: "string" },
                optional: { type: "boolean" },
              },
              required: ["action", "selector", "value", "secretRef", "description", "optional"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "key",
          "title",
          "description",
          "category",
          "riskLevel",
          "requiresLogin",
          "userRoleKey",
          "steps",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["appType", "summary", "userRoles", "stack", "flows"],
  additionalProperties: false,
} as const;

export type AnalysisResponse = {
  appType: string;
  summary: string;
  userRoles?: { key: string; title: string; description: string; isPrimary: boolean }[];
  stack: { framework: string; auth: string; database: string; hosting: string };
  flows: {
    key: string;
    title: string;
    description: string;
    category: string;
    riskLevel: string;
    requiresLogin: boolean;
    userRoleKey?: string | null;
    steps: {
      action: string;
      selector: string | null;
      value: string | null;
      secretRef: string | null;
      description: string;
      optional: boolean;
    }[];
  }[];
};
