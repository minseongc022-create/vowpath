/**
 * 자비스 타입 — 하나의 정의
 *
 * 옛 구현은 타입이 1,200줄짜리 한 파일에 쌓여 있었고, 같은 개념이 이름만
 * 다르게 여러 번 등장했다(ConsignmentPick / ImportPick / JarvisListingDraft가
 * 겹치는 필드를 각자 들고 있었다). 그래서 한 곳을 고치면 다른 곳이 어긋났다.
 *
 * 여기서는 흐름을 따라 **네 개**만 둔다:
 *
 *   Candidate  → 소싱이 찾아낸 후보 (공급처·원가·가격까지 확정)
 *   Draft      → 검수 대기 초안 (상세페이지까지 완성, 사장님 승인 대기)
 *   Listing    → 토스에 실제로 올라간 상품
 *   ChatTurn   → 대화 한 줄
 *
 * 단계가 넘어갈 때 필드를 **덧붙이기만** 하고 다시 계산하지 않는다.
 * 다시 계산하는 순간 두 값이 생기고, 그게 이 프로젝트의 모든 버그였다.
 */

// ─────────────────────────────────────────────────────────────
// 공급처
// ─────────────────────────────────────────────────────────────

export type WholesalePlatform = "domeggook" | "domeme";

export type Supplier = {
  platform: WholesalePlatform;
  /** 공급처 상품번호 */
  itemNo: string;
  title: string;
  url: string;
  /** 낱개 단가 — 배송비 **제외**. landedCostKrw와 혼동하지 말 것 */
  unitPriceKrw: number;
  /** 입고 배송비 (1건 기준) */
  shippingKrw: number;
  /**
   * 낱개 단가 + 배송비. **마진 계산에는 항상 이 값만 쓴다.**
   * unitPriceKrw로 마진을 재면 배송비만큼 부풀려진다.
   */
  landedCostKrw: number;
  /** 최소 주문 수량 */
  moq: number;
  /**
   * 낱개(1개) 발주가 실제로 가능한지 **확인됐는가**.
   * 추정으로 true를 넣으면 안 된다 — 묶음 전용 상품의 묶음가가 낱개
   * 원가 자리에 들어가는 사고가 정확히 이렇게 났다.
   */
  singleUnitVerified: boolean;
  imageUrls: string[];
  sellerId?: string;
  /** 공급처가 밝힌 반품 정책 원문 */
  returnPolicyText?: string;
  /** API 실시간 조회 결과인가, 검색 결과 추정인가 */
  live: boolean;
};

// ─────────────────────────────────────────────────────────────
// 소싱 후보
// ─────────────────────────────────────────────────────────────

export type Candidate = {
  id: string;
  /** 이 상품을 찾아낸 검색어 */
  keyword: string;
  /** 고객에게 보일 상품명 */
  title: string;
  category: string;
  supplier: Supplier;

  /** 등록가 — rules.decidePrice가 정한 값 */
  priceKrw: number;
  /** 개당 순이익 — 수수료·광고비·반품충당 모두 뺀 뒤 */
  netProfitKrw: number;
  /** 실마진 % */
  marginPct: number;
  /** 이 가격 아래로는 적자 */
  priceFloorKrw: number;
  /** 가격을 그렇게 정한 이유 — 화면에 그대로 뜬다 */
  pricingReason: string;

  /** 광고 입찰 상한 */
  maxBidKrw: number;
  breakevenCpcKrw: number;

  /** 관측된 경쟁 최저가 (있을 때만) */
  competitorLowKrw?: number;
  foundAt: string;
};

// ─────────────────────────────────────────────────────────────
// 검수 초안
// ─────────────────────────────────────────────────────────────

export type DraftStatus =
  | "pending_review"
  | "approved"
  | "publishing"
  | "published"
  | "rejected"
  | "failed";

export type Draft = {
  id: string;
  candidate: Candidate;
  status: DraftStatus;

  /** 고객에게 보일 상세페이지 HTML (후커블식) */
  detailHtml: string;
  /** 상세페이지에 쓴 셀링포인트 — 검수 화면에서 따로 보여준다 */
  sellingPoints: string[];

  /** 토스에 보낼 등록 페이로드 */
  listingPayload: {
    name: string;
    salePrice: number;
    categoryId?: string;
    imageUrls: string[];
    detailHtml: string;
  };

  /** 사장님이 등록 전에 알아야 할 것 */
  checklist: string[];

  createdAt: string;
  updatedAt: string;
  /** 승인/반려한 사람 */
  decidedBy?: string;
  rejectReason?: string;
  /** 등록 성공 시 토스 상품번호 */
  tossProductNo?: string;
  publishError?: string;
};

// ─────────────────────────────────────────────────────────────
// 소싱 결과 기록 — "왜 0개인가"에 항상 답할 수 있게
// ─────────────────────────────────────────────────────────────

export type SourcingRun = {
  ranAt: string;
  /** 훑어본 검색어 수 */
  keywordsTried: number;
  /** 도매에서 실제로 본 상품 수 */
  productsSeen: number;
  /** 최종 후보 수 */
  candidatesFound: number;
  /**
   * 관문별 탈락 집계. 값이 큰 순서가 곧 "지금 병목이 어디인가"다.
   * 이게 없으면 "없습니다"만 반복되고 원인을 영영 모른다.
   */
  rejections: Record<string, number>;
  /** 사람이 읽는 한 줄 요약 */
  summary: string;
  elapsedMs: number;
};

// ─────────────────────────────────────────────────────────────
// 대화
// ─────────────────────────────────────────────────────────────

export type ChatRole = "owner" | "jarvis";

export type ChatTurn = {
  id: string;
  role: ChatRole;
  text: string;
  at: string;
  /** 자비스가 실제로 한 일 — 말만 하고 안 한 걸 구분하기 위해 */
  did?: string;
  /** 화면에 카드로 띄울 것들 */
  attachments?: Array<
    | { kind: "drafts"; draftIds: string[] }
    | { kind: "sourcing"; run: SourcingRun }
    | { kind: "detail"; draftId: string }
  >;
};

// ─────────────────────────────────────────────────────────────
// 30분 보고 — "몇 번 돌았고 뭘 찾았는지" 누적
// ─────────────────────────────────────────────────────────────

/**
 * 10분마다 도는 자동 사이클(수동 「소싱 다시해봐」 포함)의 실적을
 * 30분 단위로 모아뒀다가 문자로 보고한다. 사이클마다 매번 문자를
 * 보내면 스팸이 되고(예전에 실제로 사고가 났다), 아예 안 보내면
 * 사장님은 자비스가 살아있는지도 모른다 — 그 중간이 30분 보고다.
 */
export type ReportWindow = {
  /** 이 창이 시작된 시각 — 여기서부터 30분이 지나면 보고하고 새로 시작한다 */
  since: string;
  cyclesRun: number;
  keywordsTried: number;
  productsSeen: number;
  candidatesFound: number;
  draftsCreated: number;
};

export function emptyReportWindow(now: Date = new Date()): ReportWindow {
  return {
    since: now.toISOString(),
    cyclesRun: 0,
    keywordsTried: 0,
    productsSeen: 0,
    candidatesFound: 0,
    draftsCreated: 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 설정 · 상태
// ─────────────────────────────────────────────────────────────

export type Settings = {
  /** 토스 FEP API */
  tossAccessKey?: string;
  tossSecretKey?: string;
  tossSandbox?: boolean;
  /** 도매꾹 오픈 API */
  domeggookApiKey?: string;
  /** 알림받을 휴대폰 */
  alertPhone?: string;
  /** 월 목표 순이익 */
  monthlyGoalKrw: number;
  /** 자동 소싱을 돌릴 것인가 */
  autopilotEnabled: boolean;
  /**
   * 승인 없이 바로 등록할 것인가.
   * 기본은 false — 사장님이 마지막에 한 번은 본다.
   */
  autoPublish: boolean;
};

export type JarvisState = {
  version: string;
  settings: Settings;
  candidates: Candidate[];
  drafts: Draft[];
  chat: ChatTurn[];
  lastSourcingRun?: SourcingRun;
  /** 자동 운전이 마지막으로 돈 시각 */
  lastAutopilotAt?: string;
  /** 지금 자비스가 뭘 하고 있는지 — 화면에 실시간 표시 */
  activity?: { label: string; at: string; done?: boolean };
  /** 30분 보고 누적 창 */
  reportWindow: ReportWindow;
};

export const DEFAULT_SETTINGS: Settings = {
  monthlyGoalKrw: 5_000_000,
  autopilotEnabled: true,
  autoPublish: false,
  tossSandbox: false,
};
