/**
 * 자비스 대화 — 사장님이 말로 지시하고, 자비스가 실제로 실행한다
 *
 * ★ 설계 원칙: 돈이 걸린 행동은 LLM에 맡기지 않는다
 *
 * 송장 등록, 반품지 동기화 같은 건 틀리면 실제 손해가 난다. 그래서 이 모듈은
 * **결정적 파싱을 먼저** 한다 — 송장번호·택배사·주소는 정규식으로 확실하게
 * 뽑아내고, 그게 잡히면 LLM을 아예 거치지 않는다.
 *
 * LLM(OPENAI_API_KEY)은 그 위에 얹는 대화 능력일 뿐이다. 키가 없어도
 * 핵심 기능은 전부 동작한다 — "송장 1234567890 CJ", "반품지 등록했어",
 * "지금 상태 어때" 같은 말은 규칙만으로 처리된다.
 *
 * ★ 왜 이렇게까지 하나
 *
 * LLM이 송장번호를 한 자리 잘못 읽으면 고객이 배송 조회를 못 하고, 그건
 * 페널티와 CS로 돌아온다. "대충 맞으면 되는" 영역이 아니다.
 */

import type { JarvisFulfillmentJob, MerchantData } from "../types";

export const JARVIS_CHAT_VERSION = "1.0";

export type ChatIntent =
  /** 지금 상태 알려줘 */
  | "status"
  /** 지금 한 번 돌려 */
  | "run_now"
  /** 반품지 등록했으니 다시 확인해봐 */
  | "sync_return_locations"
  /** 송장 번호 등록 */
  | "register_tracking"
  /** 그 외 — 대화로 답한다 */
  | "talk";

export type ParsedTracking = {
  trackingNumber: string;
  deliveryCompany: string;
  /** 어느 주문에 붙일지 지정됐으면 */
  orderHint?: string;
};

export type ChatAction = {
  intent: ChatIntent;
  tracking?: ParsedTracking;
  /** 결정적으로 파싱됐는가 — true면 LLM을 거치지 않는다 */
  confident: boolean;
};

// ─────────────────────────────────────────────────────────────
// 결정적 파싱
// ─────────────────────────────────────────────────────────────

/**
 * 국내 주요 택배사 — 별칭까지 받는다.
 *
 * 사장님이 "씨제이", "CJ", "대한통운" 중 뭘 쓰든 같은 걸로 읽혀야 한다.
 * 여기 없는 택배사는 원문을 그대로 쓴다 — 지어내지 않는다.
 */
const COURIERS: Array<{ canonical: string; patterns: RegExp }> = [
  { canonical: "CJ대한통운", patterns: /(cj|씨제이|대한통운)/i },
  { canonical: "우체국택배", patterns: /(우체국|등기|epost)/i },
  { canonical: "한진택배", patterns: /한진/i },
  { canonical: "롯데택배", patterns: /(롯데|현대택배)/i },
  { canonical: "로젠택배", patterns: /로젠/i },
  { canonical: "대신택배", patterns: /대신/i },
  { canonical: "경동택배", patterns: /경동/i },
  { canonical: "쿠팡로지스틱스", patterns: /(쿠팡|clo)/i },
  { canonical: "GS Postbox", patterns: /(gs\s*postbox|편의점택배|gs25)/i },
  { canonical: "CU 편의점택배", patterns: /(cu\s*택배|씨유)/i },
];

function readCourier(text: string): string | null {
  for (const c of COURIERS) {
    if (c.patterns.test(text)) return c.canonical;
  }
  return null;
}

/**
 * 송장번호를 뽑는다.
 *
 * 국내 송장은 보통 10~14자리 숫자다(하이픈이 섞이기도 한다). 전화번호와
 * 헷갈리면 안 되므로, 010으로 시작하는 11자리는 제외한다 — 고객 전화번호를
 * 송장으로 등록하면 배송 조회가 통째로 깨진다.
 */
function readTrackingNumber(text: string): string | null {
  const candidates = text.match(/\d[\d-]{8,17}\d/g) ?? [];
  for (const raw of candidates) {
    const digits = raw.replace(/-/g, "");
    if (digits.length < 10 || digits.length > 14) continue;
    if (/^010\d{8}$/.test(digits)) continue; // 휴대폰 번호
    if (/^0\d{1,2}\d{7,8}$/.test(digits) && digits.length <= 11) continue; // 유선 전화
    return digits;
  }
  return null;
}

const RUN_PATTERNS = /(지금\s*(한번|한\s*번)?\s*(돌려|실행|시작)|실행해|돌려줘|시작해|가동)/;
const STATUS_PATTERNS = /(상태|어때|어떻게\s*(돼|되)|잘\s*되|현황|뭐하고|리포트|보고)/;
const RETURN_SYNC_PATTERNS =
  /(반품지).{0,20}(등록|넣었|추가|했어|했다|완료)|(등록|추가).{0,10}(했으니|했어).{0,20}(확인|반영|동기화)|반품지.{0,10}(확인|동기화|다시)/;

/**
 * 사장님 말에서 **실행할 행동**을 뽑는다.
 *
 * 송장이 가장 우선이다 — 숫자와 택배사가 같이 있으면 다른 해석의 여지가 없고,
 * 그게 가장 시간에 민감한 작업이기 때문이다(발송 지연은 페널티로 직결).
 */
export function parseChatAction(message: string): ChatAction {
  const text = message.trim();

  const trackingNumber = readTrackingNumber(text);
  const deliveryCompany = readCourier(text);
  if (trackingNumber && deliveryCompany) {
    return {
      intent: "register_tracking",
      tracking: { trackingNumber, deliveryCompany },
      confident: true,
    };
  }

  if (RETURN_SYNC_PATTERNS.test(text)) {
    return { intent: "sync_return_locations", confident: true };
  }
  if (RUN_PATTERNS.test(text)) {
    return { intent: "run_now", confident: true };
  }
  if (STATUS_PATTERNS.test(text)) {
    return { intent: "status", confident: true };
  }

  // 송장번호만 있고 택배사가 없으면 되물어야 한다 — 추측하면 안 된다
  if (trackingNumber && !deliveryCompany) {
    return { intent: "register_tracking", confident: false };
  }

  return { intent: "talk", confident: false };
}

// ─────────────────────────────────────────────────────────────
// 상태 요약 — 자비스가 스스로를 설명하는 근거
// ─────────────────────────────────────────────────────────────

export type JarvisStatusSummary = {
  running: boolean;
  lastRanAt?: string;
  publishedCount: number;
  pendingReviewCount: number;
  activeOrders: number;
  awaitingTracking: number;
  pendingReturnAddresses: number;
  monthlyNetKrw: number;
  goalKrw: number;
  /** 사장님이 지금 해야 할 일 — 없으면 빈 배열 */
  todos: string[];
};

export function summarizeJarvisStatus(data: MerchantData, goalKrw: number): JarvisStatusSummary {
  const drafts = data.listingDrafts ?? [];
  const jobs = data.fulfillmentJobs ?? [];
  const report = data.lastAutopilotReport;

  const awaitingTracking = jobs.filter(
    (j) => j.status !== "tracking_registered" && j.status !== "cancelled",
  ).length;

  const todos: string[] = [];
  const pendingAddrs = data.pendingReturnAddresses ?? [];
  if (pendingAddrs.length > 0) {
    todos.push(
      `반품지 ${pendingAddrs.length}곳 등록하면 그 공급처들 반품 비용이 0원이 됩니다`,
    );
  }
  const needTracking = jobs.filter(
    (j) => j.status === "wholesale_ordered" && !j.pendingTrackingNumber,
  ).length;
  if (needTracking > 0) {
    todos.push(`발주한 주문 ${needTracking}건 — 공급처 송장 나오면 여기 붙여넣어 주세요`);
  }

  return {
    running: report?.enabled ?? false,
    lastRanAt: report?.ranAt,
    publishedCount: drafts.filter((d) => d.status === "published").length,
    pendingReviewCount: drafts.filter((d) => d.status === "pending_review").length,
    activeOrders: jobs.length,
    awaitingTracking,
    pendingReturnAddresses: pendingAddrs.length,
    monthlyNetKrw: report?.winners?.actualMonthlyNetKrw ?? 0,
    goalKrw,
    todos,
  };
}

/** 상태를 사람이 읽는 한 문단으로 — LLM 없이도 쓸 수 있는 기본 답변 */
export function renderStatusReply(s: JarvisStatusSummary): string {
  const lines: string[] = [];
  lines.push(
    s.running
      ? "지금 돌고 있습니다 (60초마다 시장을 보고 있어요)."
      : "지금 멈춰 있습니다 — 실행 버튼을 눌러주세요.",
  );
  lines.push(
    `등록 ${s.publishedCount}개 · 승인 대기 ${s.pendingReviewCount}개 · 진행 중인 주문 ${s.activeOrders}건`,
  );
  if (s.monthlyNetKrw > 0) {
    const pct = s.goalKrw > 0 ? Math.round((s.monthlyNetKrw / s.goalKrw) * 100) : 0;
    lines.push(`이번 달 실제 순익 ${s.monthlyNetKrw.toLocaleString()}원 (목표의 ${pct}%)`);
  }
  if (s.todos.length) {
    lines.push("", "사장님이 해주실 것:");
    for (const t of s.todos) lines.push(`· ${t}`);
  } else {
    lines.push("", "지금 사장님이 하실 일은 없습니다.");
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// 송장 매칭
// ─────────────────────────────────────────────────────────────

/**
 * 송장을 어느 주문에 붙일지 고른다.
 *
 * 발주까지 끝났는데 송장이 아직 없는 주문 중 **가장 오래 기다린 것**을 고른다 —
 * 공급처는 보통 발주 순서대로 출고하고, 오래 기다린 주문이 발송 지연 페널티에
 * 가장 가깝기 때문이다.
 *
 * 후보가 여러 개면 그 사실을 함께 돌려준다 — 자비스가 "이 주문 맞나요?"라고
 * 확인할 수 있게. 잘못 붙이면 두 고객의 배송 조회가 동시에 깨진다.
 */
export function pickJobForTracking(jobs: JarvisFulfillmentJob[]): {
  job: JarvisFulfillmentJob | null;
  ambiguous: boolean;
  candidateCount: number;
} {
  const waiting = jobs
    .filter(
      (j) =>
        j.status !== "tracking_registered" &&
        j.status !== "cancelled" &&
        !j.pendingTrackingNumber,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    job: waiting[0] ?? null,
    ambiguous: waiting.length > 1,
    candidateCount: waiting.length,
  };
}
