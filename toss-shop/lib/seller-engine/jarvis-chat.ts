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
  /** 지금 발주해야 할 주문 정보를 붙여넣기 좋게 달라 */
  | "supplier_order_info"
  /** 도매처에 발주 넣었다 — 송장 대기로 넘겨라 */
  | "mark_ordered"
  /** 등록해야 할 반품지 주소 목록을 달라 */
  | "return_addresses"
  /** 알림 받을 내 번호는 이거다 */
  | "set_alert_phone"
  /** 문자가 실제로 오는지 지금 한 통 보내봐 */
  | "test_alert"
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
  /** set_alert_phone일 때 E.164로 정규화된 번호 */
  alertPhone?: string;
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

/**
 * 알림 받을 번호를 말한 것인지 판별한다.
 *
 * 번호만 덜렁 보내면 송장인지 전화번호인지 알 수 없다. 그래서 **한국 휴대폰
 * 형태(010…)** 이면서 번호/알림/문자 같은 말이 같이 있을 때만 번호 등록으로
 * 본다. 송장 파서는 010 11자리를 이미 제외하므로 서로 부딪히지 않는다.
 */
const PHONE_INTENT_PATTERNS = /(번호|폰|핸드폰|휴대폰|알림|문자|연락)/;

function readOwnerPhone(text: string): string | null {
  if (!PHONE_INTENT_PATTERNS.test(text)) return null;
  const m = text.match(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return null;
  return `+82${digits.slice(1)}`;
}

/**
 * 문자 테스트 — 설정이 끝났는지 12시간 기다려 보고 알 수는 없다.
 *
 * 실제로는 통신사·Twilio 지역 허용 같은 게 걸려서 안 오는 경우가 대부분인데,
 * 그건 진짜 급한 알림이 필요한 순간에 발견하면 이미 늦다. 그래서 지금 당장
 * 한 통 보내보는 길을 열어둔다.
 */
const TEST_ALERT_PATTERNS =
  // "확인해봐"는 테스트지만 "확인했어"는 알림을 봤다는 뜻이다. 이 둘을 같이
  // 잡으면 사장님이 "알림 확인했어"라고 할 때마다 문자가 한 통씩 더 간다.
  /(문자|알림|sms).{0,10}(테스트|보내봐|시험|확인해\s*줘|확인해\s*봐|와\?|오나|되나)|테스트.{0,6}(문자|알림)/i;

const RUN_PATTERNS = /(지금\s*(한번|한\s*번)?\s*(돌려|실행|시작)|실행해|돌려줘|시작해|가동)/;
const STATUS_PATTERNS = /(상태|어때|어떻게\s*(돼|되)|잘\s*되|현황|뭐하고|리포트|보고)/;
const ORDER_INFO_PATTERNS =
  /(발주|주문).{0,6}(정보|내역|뭐|목록|알려|줘|해야|리스트)|뭐.{0,4}발주|발주할\s*거/;
const ORDER_DONE_PATTERNS =
  /(발주|주문).{0,6}(했어|했다|완료|넣었|끝냈|보냈|나갔)|(넣었|보냈).{0,4}발주/;
const RETURN_ADDR_PATTERNS =
  /반품지.{0,10}(주소|목록|알려|줘|뭐|어디|리스트)|(주소|목록).{0,6}(줘|알려).{0,6}반품/;
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

  if (TEST_ALERT_PATTERNS.test(text)) {
    return { intent: "test_alert", confident: true };
  }

  const alertPhone = readOwnerPhone(text);
  if (alertPhone) {
    return { intent: "set_alert_phone", alertPhone, confident: true };
  }

  // "반품지 등록했어"(동기화)가 "반품지 주소 줘"(목록)보다 먼저다 —
  // 앞엣것은 실제 상태를 바꾸는 행동이라 놓치면 안 된다.
  if (RETURN_SYNC_PATTERNS.test(text)) {
    return { intent: "sync_return_locations", confident: true };
  }
  if (RETURN_ADDR_PATTERNS.test(text)) {
    return { intent: "return_addresses", confident: true };
  }
  // "발주했어"가 "발주 정보 줘"보다 먼저 — 완료 보고를 정보 요청으로
  // 잘못 읽으면 주문이 계속 발주 대기로 남아 발송기한을 넘긴다.
  if (ORDER_DONE_PATTERNS.test(text)) {
    return { intent: "mark_ordered", confident: true };
  }
  if (ORDER_INFO_PATTERNS.test(text)) {
    return { intent: "supplier_order_info", confident: true };
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

/** 이 시간 안에 한 바퀴 돈 적이 있어야 "돌고 있다"고 말할 수 있다 */
const RUNNING_WINDOW_MS = 30 * 60 * 1000;

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
  // 발주가 가장 앞이다 — 이게 밀리면 발송기한을 넘겨 배송 인센티브(수수료 0%)가
  // 통째로 날아간다. 반품지는 셀러 주소 폴백으로 판매가 계속되지만 발주는 대안이 없다.
  const needOrder = pickJobsNeedingOrder(jobs).length;
  if (needOrder > 0) {
    todos.unshift(`발주 안 나간 주문 ${needOrder}건 — 「발주 정보 줘」라고 하시면 바로 알려드립니다`);
  }
  const needTracking = jobs.filter(
    (j) => j.status === "wholesale_ordered" && !j.pendingTrackingNumber,
  ).length;
  if (needTracking > 0) {
    todos.push(`발주한 주문 ${needTracking}건 — 공급처 송장 나오면 여기 붙여넣어 주세요`);
  }

  // "돌고 있다"는 **최근에 실제로 돌았을 때만** 참이다.
  //
  // 종전엔 환경변수 스위치(enabled)를 그대로 보여줬다. 그래서 심박이 끊겨
  // 하루 종일 아무것도 안 돌아도 화면엔 "24시간 돌고 있습니다"가 떠 있었다.
  // 그 상태에서 사장님은 기다리기만 하고, 그 사이 발송기한이 넘어간다.
  const lastRanMs = report?.ranAt ? Date.parse(report.ranAt) : NaN;
  const running =
    (report?.enabled ?? false) &&
    Number.isFinite(lastRanMs) &&
    Date.now() - lastRanMs < RUNNING_WINDOW_MS;

  return {
    running,
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
      : "지금 멈춰 있습니다 — 「지금 돌려」라고 말씀해 주세요.",
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

// ─────────────────────────────────────────────────────────────
// 발주 — 사람이 해야 하는 유일한 반복 작업
// ─────────────────────────────────────────────────────────────

/**
 * 아직 도매처에 발주가 안 나간 주문.
 *
 * 도매매/도매꾹은 발주 API를 외부에 열어두지 않는다(API대행사 승인 모델).
 * 그래서 자비스는 **발주에 필요한 정보를 전부 만들어 놓고** 사장님이 붙여넣기만
 * 하면 되는 상태까지만 간다. 오래 기다린 것부터 — 그게 발송기한에 가장 가깝다.
 */
/** 한 번에 안내하는 발주 건수 — 「발주했어」가 처리하는 건수와 반드시 같아야 한다 */
export const ORDER_BRIEF_LIMIT = 3;

export function pickJobsNeedingOrder(jobs: JarvisFulfillmentJob[]): JarvisFulfillmentJob[] {
  return jobs
    .filter(
      (j) =>
        j.status === "detected" ||
        j.status === "toss_preparing" ||
        j.status === "wholesale_ready",
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * 발주 화면에 그대로 붙여넣을 수 있는 형태로 뽑는다.
 *
 * 도매매 주문서는 수취인·연락처·우편번호·주소·수량을 각각 다른 칸에 넣게 되어
 * 있다. 그래서 한 덩어리 문장이 아니라 **줄마다 한 항목**으로 준다 — 그래야
 * 한 줄씩 복사해 넣을 수 있고, 옮겨 적다 틀릴 일이 없다. 배송지를 한 글자
 * 잘못 넣으면 물건이 엉뚱한 데로 가고 그건 전액 손실이다.
 */
export function renderSupplierOrderBrief(
  jobs: JarvisFulfillmentJob[],
  limit = ORDER_BRIEF_LIMIT,
): string {
  if (jobs.length === 0) {
    return "지금 발주할 주문이 없습니다. 주문이 들어오면 바로 알려드릴게요.";
  }
  const lines: string[] = [`발주 대기 ${jobs.length}건입니다. 아래를 그대로 넣으시면 됩니다.`];
  for (const j of jobs.slice(0, limit)) {
    lines.push("");
    lines.push(`■ ${j.productName} · ${j.quantity}개`);
    if (j.supplierUrl) lines.push(`상품: ${j.supplierUrl}`);
    else if (j.itemNo) lines.push(`상품번호: ${j.itemNo}`);
    lines.push(`수취인: ${j.customer.name}`);
    lines.push(`연락처: ${j.customer.phone}`);
    lines.push(`우편번호: ${j.customer.zipCode}`);
    lines.push(`주소: ${j.customer.address}`);
    lines.push(`수량: ${j.quantity}`);
  }
  if (jobs.length > limit) {
    lines.push("", `…외 ${jobs.length - limit}건. 이만큼 넣으시고 「발주했어」 하시면 다음 걸 드립니다.`);
  }
  lines.push("", "다 넣으셨으면 「발주했어」라고만 해주세요. 그다음은 제가 송장까지 봅니다.");
  return lines.join("\n");
}
