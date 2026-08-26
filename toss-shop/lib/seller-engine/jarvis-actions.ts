/**
 * 자비스가 할 수 있는 일 — 한 곳에 모아둔다
 *
 * ★ 왜 모았나
 *
 * 종전엔 대화 라우트 안에 if문으로 흩어져 있었다. 그래서 정규식이 잡아내는
 * 말투("지금 돌려")로만 실행되고, 조금만 다르게 말하면 — "추가적은 소싱 해" —
 * LLM이 "그렇게 말씀해 주시면 바로 처리됩니다"라고 **안내만 하고 끝났다**.
 * 사장님 입장에서는 시킨 일이 안 된 것이다.
 *
 * 이제 행동은 전부 여기 있고, 두 갈래가 같은 걸 부른다:
 *
 *   1. 결정적 파싱 — 송장번호처럼 틀리면 손해가 나는 건 정규식이 먼저 잡는다
 *   2. LLM 계획 — 그 외의 아무 말투나. LLM은 **어떤 행동인지만 고르고**,
 *      실행은 여기 있는 코드가 한다
 *
 * LLM에게 실행을 맡기지 않는 이유는 그대로다. 고르는 것과 하는 것을 분리하면,
 * LLM이 헛소리를 해도 실제로 벌어지는 일은 항상 이 파일에 적힌 것뿐이다.
 */

import type { ChatIntent } from "./jarvis-chat";

export const JARVIS_ACTIONS_VERSION = "1.0";

/** 대화로 실행 가능한 모든 행동 */
export type JarvisActionName =
  | ChatIntent
  | "discover"
  | "set_goal"
  | "ack_alerts";

export type JarvisAction = {
  name: JarvisActionName;
  trackingNumber?: string;
  deliveryCompany?: string;
  alertPhone?: string;
  /** set_goal — 월 목표 순이익(원) */
  goalKrw?: number;
  /** discover — 얼마나 넓게 훑을지 */
  deep?: boolean;
};

export type ActionResult = {
  /** 사장님에게 보여줄 답 */
  reply: string;
  /** 실제로 무슨 일이 있었는지 — 화면에 단계로 뜬다 */
  steps: string[];
  did: JarvisActionName | "talk" | "error";
};

/** 목표는 이 범위 밖으로 못 잡는다 — 밖은 계획이 아니라 희망이다 */
export const MIN_GOAL_KRW = 1_000_000;
export const MAX_GOAL_KRW = 30_000_000;

/**
 * "월 천만원", "700만원", "2천만원" 같은 말에서 금액을 읽는다.
 *
 * 한국어 금액 표기는 단위가 섞인다 — 천만/1000만/1,000만원이 다 같은 값이다.
 * 셋 다 같은 값으로 읽히지 않으면 사장님은 목표가 안 바뀐 줄 알고 같은 말을
 * 반복하게 된다.
 */
export function readGoalKrw(text: string): number | null {
  const t = text.replace(/,/g, "");

  // "2천만", "1천5백만" 같은 표기
  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) return clampGoal(Math.round(parseFloat(eok[1]) * 100_000_000));

  const cheonMan = t.match(/(\d+(?:\.\d+)?)\s*천\s*만/);
  if (cheonMan) return clampGoal(Math.round(parseFloat(cheonMan[1]) * 10_000_000));
  if (/(?<!\d)천\s*만/.test(t)) return clampGoal(10_000_000);

  const man = t.match(/(\d+(?:\.\d+)?)\s*백\s*만/);
  if (man) return clampGoal(Math.round(parseFloat(man[1]) * 1_000_000));

  const plainMan = t.match(/(\d+(?:\.\d+)?)\s*만/);
  if (plainMan) return clampGoal(Math.round(parseFloat(plainMan[1]) * 10_000));

  // "10000000원" 같은 순수 숫자 — 목표로 쓸 만한 크기일 때만
  const won = t.match(/(\d{6,})\s*원/);
  if (won) return clampGoal(parseInt(won[1], 10));

  return null;
}

function clampGoal(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  if (n < MIN_GOAL_KRW || n > MAX_GOAL_KRW) return null;
  return n;
}

/** 화면에 그대로 뜨는 진행 문구 — 무슨 일이 일어나는지 사장님이 보게 */
export const ACTION_LABELS: Record<JarvisActionName, string> = {
  status: "상태 확인하는 중",
  run_now: "시장 보고 상품 만드는 중",
  discover: "도매꾹 구석구석 뒤지는 중",
  sync_return_locations: "토스에서 반품지 다시 읽는 중",
  register_tracking: "토스에 송장 올리는 중",
  supplier_order_info: "발주 정보 정리하는 중",
  mark_ordered: "발주 완료로 넘기는 중",
  return_addresses: "등록할 반품지 주소 뽑는 중",
  set_alert_phone: "알림 번호 저장하는 중",
  test_alert: "문자 보내보는 중",
  set_goal: "목표 다시 잡는 중",
  ack_alerts: "알림 끄는 중",
  talk: "생각하는 중",
};


// ─────────────────────────────────────────────────────────────
// LLM 없이도 되는 것들
//
// OPENAI_API_KEY가 없거나 응답이 막혀도 사장님이 자주 쓰는 지시는 동작해야
// 한다. 대화 기능이 죽었다고 소싱까지 멈추면 안 된다.
// ─────────────────────────────────────────────────────────────

const DISCOVER_PATTERNS =
  /(소싱|발굴).{0,6}(해|하자|해봐|더|시작)|더\s*찾|싹\s*다\s*(찾|뒤|훑)|(구석구석|광범위|전부|샅샅이).{0,8}(찾|뒤|훑|분석)|찾아\s*봐|뒤져/;

// 확인은 **문장 앞에서 분명히 말했을 때만** 잡는다. "확인"이 아무 데나 있어도
// 잡으면 "반품지 확인해줘" 같은 말이 알림 끄기로 새어 나간다.
const ACK_PATTERNS =
  /^\s*(확인\s*했|봤어|봤다|알겠|알았|오케이|ㅇㅋ|ok)|알림\s*(그만|중지|멈춰|끄)|그만\s*보내/i;

const GOAL_PATTERNS = /(목표|벌게|벌어|벌자|달성)/;

/**
 * 정규식만으로 잡히는 지시를 읽는다.
 *
 * 여기 있는 셋은 전부 **되돌릴 수 있는** 것들이다. 되돌릴 수 없는 것(송장
 * 등록)은 절대 여기 넣지 않는다 — 말투 추측으로 실행하면 안 되는 영역이다.
 */
export function parseExtraAction(message: string): JarvisAction | null {
  const text = message.trim();

  // 목표가 먼저다. "월 천만원 벌게 만들어"는 소싱 지시처럼 보이지만
  // 실제로 바뀌어야 하는 건 목표값이고, 소싱량은 거기서 역산된다.
  if (GOAL_PATTERNS.test(text)) {
    const goalKrw = readGoalKrw(text);
    if (goalKrw) return { name: "set_goal", goalKrw };
  }
  if (ACK_PATTERNS.test(text)) return { name: "ack_alerts" };
  if (DISCOVER_PATTERNS.test(text)) {
    return { name: "discover", deep: /(싹\s*다|전부|구석구석|샅샅이|광범위|더\s*넓게)/.test(text) };
  }
  return null;
}
