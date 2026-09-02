/**
 * 채비 도메인 모델.
 *
 * 흐름은 한 방향이다:
 *   말 한 줄 → SituationBrief(무슨 일인지) → Plan(무엇을 어떤 순서로)
 *   → PlanItem별 Fulfillment(실제 예약·구매) → Timeline(당일 동선)
 *
 * 각 단계가 독립적으로 검증 가능해야 해서 중간 산출물을 전부 타입으로 남긴다.
 */

/** 무슨 상황인가 — 예산 배분과 항목 구성이 여기서 갈린다. */
export type OccasionKind =
  | "birthday"
  | "anniversary"
  | "proposal"
  | "parents_day"
  | "date"
  | "apology"
  | "congratulation"
  | "farewell"
  | "other";

/** 누구를 위한 자리인가 — 선물 추천의 1차 필터. */
export type RelationKind =
  | "girlfriend"
  | "boyfriend"
  | "spouse"
  | "parent"
  | "friend"
  | "colleague"
  | "child"
  | "self"
  | "unknown";

/** 준비물의 종류. 카탈로그 카테고리와 1:1로 맞춘다. */
export type NeedKind =
  | "restaurant"
  | "cake"
  | "gift"
  | "flower"
  | "activity"
  | "photo"
  | "transport";

export type TimeOfDay = "morning" | "lunch" | "afternoon" | "evening" | "night";

export type Urgency = "today" | "tomorrow" | "this_week" | "later";

/** 되물어야 할 정보 — 최대 2개까지만 묻는 게 원칙이다. */
export type MissingField = "date" | "region" | "budget" | "relation" | "headcount";

export type SituationBrief = {
  /** 사용자가 실제로 입력한 원문 */
  rawText: string;
  occasion: OccasionKind;
  /** "여자친구 생일 · 내일 저녁" 같은 한 줄 요약 */
  headline: string;
  relation: RelationKind;
  /** "여자친구", "어머니" 등 사용자가 쓴 호칭 그대로 */
  recipientLabel: string | null;
  /** YYYY-MM-DD (Asia/Seoul 기준) */
  dateISO: string;
  timeOfDay: TimeOfDay;
  /** HH:mm — 자리 시작 시각 */
  startTime: string;
  urgency: Urgency;
  /** "서울 강남" 같은 표기. 카탈로그 매칭 키. */
  regionLabel: string;
  regionKey: string;
  /** 총예산(원). 사용자가 안 밝히면 상황별 기본값. */
  budgetKrw: number;
  /** 사용자가 예산을 직접 말했는가 — 말했으면 초과 배분을 하지 않는다. */
  budgetStated: boolean;
  headcount: number;
  /** "조용한", "분위기 좋은" 등 */
  vibes: string[];
  needs: NeedKind[];
  /** 알레르기·비건·주차 등 반영해야 할 제약 */
  constraints: string[];
  notes: string;
  /** 0~1. 낮으면 확인 화면에서 "이거 맞나요?"를 더 크게 띄운다. */
  confidence: number;
  missing: MissingField[];
  /** LLM이 뽑았는지, 규칙 파서가 뽑았는지 */
  source: "ai" | "rules";
};

/** 카탈로그의 한 항목 — 식당 한 곳, 케이크 한 종, 선물 하나. */
export type CatalogItem = {
  id: string;
  need: NeedKind;
  name: string;
  /** "이탈리안 다이닝", "생화 꽃다발" */
  category: string;
  /** 지역 키. 배송 상품은 "nationwide". */
  regionKey: string;
  regionLabel: string;
  /** 1인 기준 가격(식당) 또는 개당 가격(그 외), 원 */
  priceKrw: number;
  /** 가격이 1인 기준인가 */
  perPerson: boolean;
  rating: number;
  reviewCount: number;
  /** 매칭에 쓰는 태그: 분위기·취향·상황 */
  tags: string[];
  /** 준비에 필요한 최소 시간(시간 단위). 당일 가능 여부를 가른다. */
  leadTimeHours: number;
  /** 예약/주문 방식 */
  fulfillment: "reserve" | "pickup" | "delivery" | "instant";
  /** 예약 가능 시간대 (식당·액티비티) */
  slots?: string[];
  /** 한 줄 추천 이유 템플릿에 쓰는 특징 */
  highlight: string;
  /** 취소 규정 안내 */
  cancelPolicy: string;
  /** 도보/차량 이동 기준점이 되는 대략적 위치 설명 */
  addressHint: string;
  /** 배송 상품이면 마감 시각(HH:mm) — 이 시각 전 주문해야 익일 도착 */
  orderCutoff?: string;
};

/** 한 항목의 실행 상태. 실제 파트너 API가 붙어도 이 상태값은 그대로 쓴다. */
export type ItemStatus =
  | "draft" // 아직 확정 전 (사용자 확인 화면)
  | "requested" // 요청 보냄
  | "pending" // 파트너 확인 중
  | "confirmed" // 확정
  | "in_transit" // 배송/이동 중
  | "ready" // 픽업 준비됨
  | "done" // 완료
  | "reassigned" // 원래 자리가 막혀 대안으로 자동 교체됨
  | "failed" // 실패 (사용자 조치 필요)
  | "skipped"; // 사용자가 제외

export type PlanItem = {
  id: string;
  need: NeedKind;
  /** 선택된 카탈로그 항목 */
  catalogId: string;
  /** 대안 후보 (사용자가 바꿀 수 있는 것들) */
  alternativeIds: string[];
  /** 이 항목에 배정된 예산(원) */
  budgetKrw: number;
  /** 실제 가격(원) — 인원수까지 반영된 최종 금액 */
  priceKrw: number;
  /** 예약 시각 HH:mm (해당되는 경우) */
  scheduledAt: string | null;
  /** 사용자에게 보여줄 한 줄 이유 */
  reason: string;
  /** 사용자가 직접 고른 항목인가 (AI 추천을 바꿨는가) */
  userPicked: boolean;
  status: ItemStatus;
  /** 상태별 사람이 읽는 설명 */
  statusNote: string;
  /** 파트너 예약 번호 */
  reference: string | null;
  /** reassigned인 경우 원래 무엇이었는지 */
  replacedCatalogId?: string;
  /** 마지막 상태 변경 시각 (epoch ms) */
  updatedAt: number;
};

export type TimelineEntry = {
  /** HH:mm */
  at: string;
  title: string;
  detail: string;
  itemId: string | null;
  kind: "prepare" | "move" | "main" | "handover" | "wrapup";
};

export type PlanStatus = "draft" | "running" | "confirmed" | "completed" | "cancelled";

export type Plan = {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  /** 사용자가 "이대로 준비해주세요"를 누른 시각 */
  confirmedAt: number | null;
  status: PlanStatus;
  brief: SituationBrief;
  items: PlanItem[];
  timeline: TimelineEntry[];
  /** 총액(원) — skipped 제외 */
  totalKrw: number;
  /** AI가 사용자에게 건네는 첫 마디 */
  openingLine: string;
  /** 지금 당장 해야 할 응급/사전 조치 (있으면) */
  immediateSteps: string[];
  /** 실제 파트너 연동 여부. false면 화면에 시범 모드라고 밝힌다. */
  liveFulfillment: boolean;
};

/** 목록 화면용 축약형 */
export type PlanSummary = {
  id: string;
  headline: string;
  occasion: OccasionKind;
  dateISO: string;
  status: PlanStatus;
  totalKrw: number;
  itemCount: number;
  doneCount: number;
  updatedAt: number;
};

export type ApiError = { error: string; message: string };
