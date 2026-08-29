/**
 * 자비스가 할 수 있는 일 — 목록과 말귀 알아듣기
 *
 * ★ 두 갈래로 알아듣는다
 *
 *   1. 규칙 — 틀리면 손해가 나는 것(등록·삭제)은 정규식이 먼저 확실히 잡는다
 *   2. LLM — 그 외의 아무 말투나. LLM은 **어떤 일인지 고르기만** 하고,
 *      실행은 항상 코드가 한다
 *
 * LLM에게 실행까지 맡기지 않는 이유: 고르는 것과 하는 것을 분리하면, LLM이
 * 헛소리를 해도 실제로 벌어지는 일은 항상 이 파일에 적힌 것뿐이다.
 *
 * ★ 되돌릴 수 없는 일은 규칙으로만 잡는다
 *
 * `publish`(진짜로 파는 것)는 문장 전체가 그 뜻일 때만 잡는다. "사진 좀
 * 올려줘"처럼 무관한 문장에 '올려'가 흔히 섞이는데, 그걸 발행으로 오인하면
 * 사장님이 보지도 않은 상품이 팔리기 시작한다.
 */

export type IntentName =
  /** 지금 한 바퀴 돌려 상품을 찾아라 */
  | "source_now"
  /** 지금 상태 알려줘 */
  | "status"
  /** 검수 대기 보여줘 */
  | "show_drafts"
  /** 상세페이지 보여줘 */
  | "show_detail"
  /** 초안 다 지워 */
  | "discard_drafts"
  /** 승인된 걸 토스에 올려라 */
  | "publish"
  /** 자동 운전 켜기/끄기 */
  | "autopilot_on"
  | "autopilot_off"
  /** 월 목표 바꾸기 */
  | "set_goal"
  /** 소싱 기준이 뭐냐 */
  | "explain_rules"
  /** 그냥 대화 */
  | "talk";

export type Intent = {
  name: IntentName;
  /** set_goal — 월 목표 순이익(원) */
  goalKrw?: number;
  /** show_detail — 어떤 상품인지 콕 집었을 때 */
  keyword?: string;
};

/** 화면에 뜨는 진행 문구 — 지금 뭘 하는지 사장님이 보게 */
export const ACTION_LABELS: Record<IntentName, string> = {
  source_now: "도매 훑어서 상품 찾는 중",
  status: "상태 확인하는 중",
  show_drafts: "검수 대기 불러오는 중",
  show_detail: "상세페이지 불러오는 중",
  discard_drafts: "만들어 둔 초안 비우는 중",
  publish: "토스에 올리는 중",
  autopilot_on: "자동 운전 켜는 중",
  autopilot_off: "자동 운전 멈추는 중",
  set_goal: "목표 다시 잡는 중",
  explain_rules: "기준 정리하는 중",
  talk: "생각하는 중",
};

// ─────────────────────────────────────────────────────────────
// 목표 금액 읽기
// ─────────────────────────────────────────────────────────────

export const MIN_GOAL_KRW = 1_000_000;
export const MAX_GOAL_KRW = 50_000_000;

/**
 * "월 천만원", "500만원", "2천만" 같은 말에서 금액을 읽는다.
 *
 * 한국어 금액은 표기가 섞인다 — 천만/1000만/1,000만원이 다 같은 값이다.
 * 셋 다 같게 읽히지 않으면 사장님은 목표가 안 바뀐 줄 알고 같은 말을 반복한다.
 */
export function readGoalKrw(text: string): number | null {
  const t = text.replace(/,/g, "");

  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) return clamp(Math.round(parseFloat(eok[1]) * 100_000_000));

  const cheonMan = t.match(/(\d+(?:\.\d+)?)\s*천\s*만/);
  if (cheonMan) return clamp(Math.round(parseFloat(cheonMan[1]) * 10_000_000));
  if (/(?<!\d)천\s*만/.test(t)) return clamp(10_000_000);

  const baekMan = t.match(/(\d+(?:\.\d+)?)\s*백\s*만/);
  if (baekMan) return clamp(Math.round(parseFloat(baekMan[1]) * 1_000_000));

  const man = t.match(/(\d+(?:\.\d+)?)\s*만/);
  if (man) return clamp(Math.round(parseFloat(man[1]) * 10_000));

  const won = t.match(/(\d{6,})\s*원/);
  if (won) return clamp(parseInt(won[1], 10));

  return null;
}

function clamp(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (n < MIN_GOAL_KRW || n > MAX_GOAL_KRW) return null;
  return n;
}

// ─────────────────────────────────────────────────────────────
// 규칙 기반 인식
// ─────────────────────────────────────────────────────────────

const P = {
  // 되돌릴 수 있는 것들 — 넓게 잡아도 안전하다
  source: /(소싱|발굴|상품).{0,8}(해|하자|해봐|찾|더)|더\s*찾|찾아\s*봐|뒤져|한\s*바퀴|지금\s*돌려|돌려\s*줘|실행/,
  // ⚠️ `어때`만 잡으면 "오늘 날씨 어때"까지 상태 확인이 된다(테스트가 잡아냈다).
  // 그래서 **우리 일을 가리키는 말이 붙었을 때**나, 다른 주제 없이 짧게
  // 물었을 때만 잡는다. 애매하면 LLM이 문맥을 보고 판단하게 넘긴다.
  status:
    /(상태|현황|진행\s*상황|매출|얼마나\s*(벌|팔))|(장사|판매|소싱|자비스|목표).{0,6}(어때|어떻게|잘\s*(돼|되))|^\s*(지금|요즘|오늘)?\s*(어때|어떤가|어떻게\s*(돼|되)|잘\s*(돼|되))/,
  showDrafts: /(검수|대기|초안|만든\s*거|올릴\s*거).{0,8}(보여|알려|뭐|있|확인)|뭐\s*만들었/,
  showDetail: /(상세\s*페이지|상세페이지|상품\s*상세).{0,8}(보여|보고|줘|확인)/,
  rules: /(기준|조건|어떤\s*상품|어떻게\s*고르|왜\s*안|왜\s*없)/,

  // 되돌리기 어려운 것들 — 좁게 잡는다
  discard: /(초안|대기|만든\s*거|등록함).{0,8}(지워|삭제|비워|버려)|다\s*지워|전부\s*삭제/,
  autopilotOff: /(자동|자비스|소싱).{0,6}(꺼|멈춰|중지|정지|그만|스톱)|잠깐\s*멈/,
  autopilotOn: /(자동|자비스).{0,6}(켜|시작|다시\s*해|계속)|알아서\s*해|자동으로\s*해/,

  // 진짜로 파는 명령 — 문장 전체가 그 뜻일 때만
  publish: /^\s*(그럼\s*)?(이제\s*)?(다\s*)?(올려|올려도\s*돼|올려\s*줘|등록\s*해|발행\s*해|판매\s*시작)\s*[.!~]*\s*$/,

  goal: /(목표|벌게|벌어|벌자|달성|월에)/,
};

/**
 * 규칙으로 확실히 잡히는 것만 답한다. 애매하면 null을 내고 LLM에 넘긴다.
 *
 * 순서가 중요하다 — 앞에 있는 게 이긴다.
 */
export function parseIntent(message: string): Intent | null {
  const text = message.trim();
  if (!text) return null;

  // 목표가 먼저다. "월 천만원 벌게 해줘"는 소싱 지시처럼 보이지만
  // 실제로 바뀌어야 하는 건 목표값이고, 소싱량은 거기서 역산된다.
  if (P.goal.test(text)) {
    const goalKrw = readGoalKrw(text);
    if (goalKrw) return { name: "set_goal", goalKrw };
  }

  // 멈춤이 켜기보다 먼저 — 잘못 잡혀도 결과는 "안 한다"이지 "잘못 한다"가 아니다
  if (P.autopilotOff.test(text)) return { name: "autopilot_off" };
  if (P.discard.test(text)) return { name: "discard_drafts" };
  if (P.publish.test(text)) return { name: "publish" };
  if (P.autopilotOn.test(text)) return { name: "autopilot_on" };

  if (P.showDetail.test(text)) return { name: "show_detail" };
  if (P.showDrafts.test(text)) return { name: "show_drafts" };
  if (P.rules.test(text)) return { name: "explain_rules" };
  if (P.source.test(text)) return { name: "source_now" };
  if (P.status.test(text)) return { name: "status" };

  return null;
}

/** LLM이 고를 수 있는 목록 — 프롬프트에 그대로 들어간다 */
export const INTENT_MENU: Array<{ name: IntentName; when: string }> = [
  { name: "source_now", when: "지금 상품을 찾아달라고 할 때" },
  { name: "status", when: "지금 어떻게 돌아가는지 물을 때" },
  { name: "show_drafts", when: "만들어 둔 상품·검수 대기를 보고 싶어할 때" },
  { name: "show_detail", when: "상세페이지를 보고 싶어할 때" },
  { name: "discard_drafts", when: "만든 초안을 지우라고 할 때" },
  { name: "publish", when: "지금 토스에 올리라고 **분명히** 말할 때만" },
  { name: "autopilot_on", when: "자동으로 계속 해달라고 할 때" },
  { name: "autopilot_off", when: "잠깐 멈추라고 할 때" },
  { name: "set_goal", when: "월 목표 금액을 바꾸려 할 때" },
  { name: "explain_rules", when: "어떤 기준으로 상품을 고르는지 물을 때" },
  { name: "talk", when: "그 외 전부 — 질문·잡담·확신이 안 설 때" },
];
