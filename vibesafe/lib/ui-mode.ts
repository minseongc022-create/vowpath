/**
 * 간편 모드 / 전문가 모드.
 *
 * ★ 이건 "쉬운 버전"과 "진짜 버전"이 아니다
 *
 * 두 모드는 **같은 일을 한다**. 검사도, 진단도, 수정도, 검증도 동일하다.
 * 다른 것은 결과를 어떤 단어로 보여주느냐뿐이다.
 *
 *   간편   "결제하기 버튼이 눌리지 않습니다. 어제 오후 3시부터입니다."
 *   전문가 "checkout_flow step 4 failed: TimeoutError, HTTP 500, 3f2a91c"
 *
 * 간편 모드에서 정보를 **삭제하지 않는다**. 접어둘 뿐이다. 모든 화면에는
 * [기술 상세 보기]가 있고, 펼치면 전문가 모드와 같은 내용이 나온다. 사용자를
 * 보호한다는 이유로 사실을 감추면 그건 보호가 아니라 통제다.
 *
 * ★ 제품을 둘로 쪼개지 않는 이유
 *
 * 한 사람이 두 모드를 다 필요로 한다. 평소에는 "뭐가 깨졌는지"만 알고 싶고,
 * 진짜 고칠 때는 커밋 해시가 필요하다. 제품을 나누면 그 사람은 둘 다 사야 한다.
 *
 * ★ 절대 하지 않는 것: 추론
 *
 * 저장소를 읽고 "TypeScript에 테스트도 있으니 이 사람은 전문가겠군"이라고
 * 판단하지 않는다. 그 추론은 (1) 자주 틀리고 (2) 틀렸을 때 무례하며
 * (3) 사용자가 왜 그런 화면을 보는지 알 길이 없다. 물어보고, 답을 저장하고,
 * 언제든 바꿀 수 있게 한다. 그게 전부다.
 *
 * ★ VibesafeAppUserRole과 혼동 금지
 *
 * AppUserRole은 *분석 대상 앱을 쓰는 사람*(손님·사장님)이고, uiMode는
 * *VibeSafe 화면을 보는 사람*의 취향이다. "이 앱은 일반인용이니 개발자도
 * 초보겠지" 같은 연결은 성립하지 않는다 — 일반인용 앱을 만든 10년차가
 * 대부분이다. 두 값 사이에 코드 경로를 만들지 않는다.
 *
 * 이 파일은 순수하다(서버 전용 import 없음). 클라이언트 컴포넌트가 그대로
 * import한다 — permission-labels.ts와 같은 이유다.
 */

export type UiMode = "simple" | "expert";

export const UI_MODES: UiMode[] = ["simple", "expert"];

export function isUiMode(value: unknown): value is UiMode {
  return value === "simple" || value === "expert";
}

export function normalizeUiMode(value: unknown): UiMode {
  return isUiMode(value) ? value : "simple";
}

/**
 * 온보딩 질문.
 *
 * "당신은 개발자입니까?"라고 묻지 않는다. 그건 자존심이 걸린 질문이라
 * 사람들이 정직하게 답하지 않는다. 대신 **원하는 결과**를 묻는다 —
 * 어느 쪽을 골라도 부끄럽지 않게.
 */
export const UI_MODE_QUESTION = "VibeSafe가 문제를 발견했을 때 어떻게 도와드릴까요?";

export const UI_MODE_OPTIONS: Array<{
  value: UiMode;
  label: string;
  detail: string;
  example: string;
}> = [
  {
    value: "simple",
    label: "무엇이 문제인지 쉬운 말로 알려주세요",
    detail: "어떤 기능이 언제부터 안 되는지 알려드리고, 고칠 준비가 되면 버튼 하나로 끝냅니다.",
    example: "“결제하기 버튼이 눌리지 않습니다. 어제 오후 3시부터입니다.”",
  },
  {
    value: "expert",
    label: "원인과 코드까지 같이 보여주세요",
    detail: "실패한 단계, 커밋, 변경된 파일, 수정 diff를 처음부터 펼쳐서 보여드립니다.",
    example: "“checkout 4단계 실패 · TimeoutError · 3f2a91c · app/checkout/page.tsx +12 −4”",
  },
];

export const UI_MODE_LABELS: Record<UiMode, { title: string; hint: string }> = {
  simple: { title: "간편 모드", hint: "쉬운 말로. 기술 상세는 접어둡니다." },
  expert: { title: "전문가 모드", hint: "커밋·로그·diff를 처음부터 보여줍니다." },
};

/**
 * 간편 모드에서 기본으로 접어두는 것들.
 *
 * 목록을 코드에 적어 두는 이유: 새 화면을 만들 때 "이건 접어야 하나"를
 * 매번 감으로 정하면 화면마다 기준이 달라진다.
 */
export const TECHNICAL_DETAIL_KINDS = [
  "pr_link",
  "branch_name",
  "commit_sha",
  "stack_trace",
  "http_status",
  "code_diff",
  "deployment_sha",
  "selector",
  "raw_error",
] as const;

export type TechnicalDetailKind = (typeof TECHNICAL_DETAIL_KINDS)[number];

/** 지금 이 모드에서 이 정보를 처음부터 펼쳐 보여줄 것인가. */
export function showsByDefault(mode: UiMode, _kind: TechnicalDetailKind): boolean {
  return mode === "expert";
}

export const TECHNICAL_DETAIL_TOGGLE_LABEL = "기술 상세 보기";
