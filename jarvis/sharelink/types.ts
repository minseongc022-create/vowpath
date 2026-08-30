/**
 * 쉐어링크 자동화 — 타입
 *
 * ★ 자비스 소싱 파이프라인과 같은 모양을 쓴다
 *
 * Candidate → Draft → Listing 흐름을 그대로 가져왔다: 베스트랭킹에서 찾은
 * 후보(Item) → 링크 발급하고 캡션까지 만든 게시 초안(Post, 검수 대기) →
 * 실제로 올라간 게시물. 다른 파이프라인이라고 다른 모양을 쓰면 나중에
 * 두 파이프라인을 한 화면(채팅·검수)에 같이 못 보여준다.
 *
 * ★ 이 파일이 다루지 않는 것
 *
 * 상품 소싱(도매꾹)·토스 등록은 `core/types.ts`의 Candidate/Draft다. 이건
 * 완전히 다른 흐름(쉐어링크 베스트랭킹 → 링크 발급 → SNS 게시)이라 이름을
 * 겹치게 두면 "Draft"라는 말이 두 가지를 가리키게 된다. 그래서 접두어
 * `Sharelink`를 항상 붙인다.
 */

// ─────────────────────────────────────────────────────────────
// 베스트랭킹에서 찾은 후보
// ─────────────────────────────────────────────────────────────

export type SharelinkItem = {
  id: string;
  /** 쉐어링크 상품 조회 API가 주는 상품 고유 ID. 링크 발급에 그대로 쓴다 */
  productId: string;
  rank?: number;
  title: string;
  imageUrl: string;
  priceKrw: number;
  /** 화면에 "30일 최저가"로 뜨는 값이 있을 때만 — 없는데 있다고 하면 거짓 광고다 */
  discountPct?: number;
  reviewCount: number;
  ratingAvg?: number;
  /** 링크 클릭 후 24시간 안에 팔리면 받는 수익 — 개당 고정 표시금액 */
  commissionKrw?: number;
  bestSeller?: boolean;
  arrivesTomorrow?: boolean;
  category?: string;
  /** 이 후보를 왜 골랐는지 — 검수 화면에 그대로 보여준다 */
  scoreReasons: string[];
  score: number;
  foundAt: string;
};

// ─────────────────────────────────────────────────────────────
// 게시 초안 — 링크 발급 + 캡션까지 끝난 상태
// ─────────────────────────────────────────────────────────────

export type SharelinkChannel = "threads" | "instagram";

export type SharelinkPostStatus =
  | "pending_review"
  | "approved"
  | "publishing"
  | "published"
  | "rejected"
  | "failed";

export type SharelinkCaption = {
  channel: SharelinkChannel;
  /** 실제로 게시될 본문. 광고 표시 문구가 이미 포함된 최종본이다 */
  text: string;
  hashtags: string[];
};

export type SharelinkPost = {
  id: string;
  item: SharelinkItem;
  status: SharelinkPostStatus;

  /** 쉐어링크 API가 발급한 실제 수익 링크 */
  shareUrl: string;
  linkIssuedAt: string;

  captions: SharelinkCaption[];

  createdAt: string;
  updatedAt: string;
  decidedBy?: string;
  rejectReason?: string;

  /** 채널별 게시 결과 — 하나가 실패해도 다른 채널은 살아있어야 한다 */
  publishResults?: Partial<
    Record<SharelinkChannel, { ok: true; postedId: string } | { ok: false; error: string }>
  >;
};

// ─────────────────────────────────────────────────────────────
// 한 바퀴 실행 기록 — "왜 0개인가"에 항상 답할 수 있게
// ─────────────────────────────────────────────────────────────

export type SharelinkRun = {
  ranAt: string;
  itemsSeen: number;
  candidatesFound: number;
  rejections: Record<string, number>;
  summary: string;
  elapsedMs: number;
};

// ─────────────────────────────────────────────────────────────
// 설정 · 전체 상태
// ─────────────────────────────────────────────────────────────

export type SharelinkSettings = {
  /** 쉐어링크 Open API 키 — "상품을 소개·공유하는 서비스"로 승인된 뒤에만 발급된다 */
  sharelinkApiKey?: string;

  /** Threads(스레드) — 비즈니스 계정 + Meta 앱 심사 필요 */
  threadsAccessKey?: string;
  threadsUserId?: string;

  /** Instagram — 비즈니스/크리에이터 계정 + Facebook 페이지 연결 + 앱 심사 필요 */
  instagramAccessKey?: string;
  instagramUserId?: string;

  /** 어느 채널에 올릴 것인가. 심사 전인 채널은 꺼둔 채로 시작한다 */
  postToThreads: boolean;
  postToInstagram: boolean;

  /** 자동 운전을 돌릴 것인가 */
  autopilotEnabled: boolean;

  /** 승인 없이 바로 게시할 것인가. 기본은 false — 사장님이 마지막에 한 번은 본다 */
  autoPublish: boolean;

  /** 한 사이클에 새로 만들 게시 초안 상한 */
  maxPostsPerCycle: number;
};

export const DEFAULT_SHARELINK_SETTINGS: SharelinkSettings = {
  postToThreads: false,
  postToInstagram: false,
  autopilotEnabled: false,
  autoPublish: false,
  maxPostsPerCycle: 3,
};

export type SharelinkState = {
  settings: SharelinkSettings;
  items: SharelinkItem[];
  posts: SharelinkPost[];
  lastRun?: SharelinkRun;
  lastAutopilotAt?: string;
  /** 이미 링크를 발급한 productId — 같은 상품을 하루에 여러 번 올리지 않는다 */
  postedProductIds: string[];
};

export function emptySharelinkState(): SharelinkState {
  return {
    settings: { ...DEFAULT_SHARELINK_SETTINGS },
    items: [],
    posts: [],
    postedProductIds: [],
  };
}
