export type Occasion = "birthday" | "anniversary" | "date" | "proposal" | "thanks" | "special";

export type PlanCategory = "activity" | "cafe" | "meal" | "view" | "lodging" | "cake" | "flower" | "gift" | "moment";

export type AgeBand = "10대" | "20대" | "30대" | "40대" | "50대" | "60대 이상" | "미상";

export type ExperienceMood = "romantic" | "mysterious" | "trendy" | "calm" | "luxurious" | "playful" | "warm" | "nature" | "artistic" | "hidden";

export type PlanScope = "single" | "day" | "trip";

export type RequestKind = "day_plan" | "trip_plan" | "place_search" | "reservation" | "product_search";

export type ScheduleDensity = "compact" | "balanced" | "relaxed";

export type TemporaryCondition = {
  energy: "low" | "normal";
  walkingLimited: boolean;
  notes: string[];
};

export type WeatherHour = {
  time: string;
  precipitationProbability?: number;
  precipitationMm?: number;
  temperatureC?: number;
  apparentTemperatureC?: number;
  windKph?: number;
  snowfallCm?: number;
};

export type WeatherDay = {
  date: string;
  hours: WeatherHour[];
  precipitationProbabilityMax?: number;
  precipitationMm?: number;
  windKphMax?: number;
  temperatureMinC?: number;
  temperatureMaxC?: number;
  impact: "low" | "medium" | "high";
};

export type WeatherContext = {
  status: "verified" | "user_report" | "outside_forecast" | "unavailable";
  sourceLabel: string;
  checkedAt?: string;
  sourceUrl?: string;
  days: WeatherDay[];
  message: string;
};

export type JourneyRole = "opening" | "discovery" | "play" | "pause" | "centerpiece" | "highlight" | "keepsake";

export type PersonProfile = {
  id: string;
  name: string;
  relation: string;
  ageBand: AgeBand;
  preferences: string[];
  constraints: string[];
  likedFoods: string[];
  dislikedFoods: string[];
  hobbies: string[];
  moodPreferences: ExperienceMood[];
  visitedPlaceIds: string[];
  likedPlaceIds: string[];
  dislikedPlaceIds: string[];
  likedActivities?: string[];
  dislikedActivities?: string[];
  likedAtmospheres?: string[];
  dislikedAtmospheres?: string[];
  crowdTolerance?: "low" | "medium" | "high" | "unknown";
  walkingTolerance?: "low" | "medium" | "high" | "unknown";
  likedPlanIds?: string[];
  dislikedPlanIds?: string[];
  notes: string[];
  updatedAt: string;
};

export type PersonMemoryUpdate = {
  preferences: string[];
  constraints: string[];
  likedFoods: string[];
  dislikedFoods: string[];
  hobbies: string[];
  likedActivities: string[];
  dislikedActivities: string[];
  likedAtmospheres: string[];
  dislikedAtmospheres: string[];
  crowdTolerance: "low" | "medium" | "high" | "unknown";
  walkingTolerance: "low" | "medium" | "high" | "unknown";
  notes: string[];
};

export type LimitedExperience = {
  label: string;
  status: "verified" | "candidate" | "unknown";
  startDate?: string;
  endDate?: string;
  verifiedAt?: string;
  sourceUrl?: string;
};

export type ExperienceProfile = {
  moods: ExperienceMood[];
  traits: string[];
  specialnessScore: number;
  qualityScore: number;
  rarityScore: number;
  photoValueScore: number;
  journeyRole: JourneyRole;
  highlightReason?: string;
  limited?: LimitedExperience;
};

export type CompanionRelationLabel = "연인" | "친구" | "가족" | "동료" | "기타";

export type CompanionLink = {
  id: string;
  memberIds: [string, string];
  memberNames: [string, string];
  relationLabel: CompanionRelationLabel;
  createdAt: string;
};

export type CompanionInvite = {
  code: string;
  fromId: string;
  fromName: string;
  relationLabel: CompanionRelationLabel;
  note?: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked";
  acceptedBy?: string;
};

export type PaceFeedbackScope = "session" | "profile";

export type PacePreference = {
  personId: string;
  companionKey: string;
  density?: ScheduleDensity;
  placesPerDay?: number;
  notes: string[];
  updatedAt: string;
};

export type PlanChangeLogEntry = {
  id: string;
  actorId: string;
  actorLabel: string;
  summary: string;
  createdAt: string;
};

export type ItemVisibility = "shared" | "secret";
export type PlanKind = "solo" | "shared";
export type LiveItemState = "upcoming" | "current" | "done" | "skipped";

/**
 * How much a secret item reveals to a companion who is otherwise allowed to view the plan:
 * hidden — not present at all (the default, safest); time_only — a blank "일정 있음" slot so
 * the timeline still reads as internally consistent; label_only — a generic "서프라이즈 일정"
 * label with no place/price. Never affects what the scheduling engine itself uses.
 */
export type SecretDisclosure = "hidden" | "time_only" | "label_only";

export type PrepCategory = "flower" | "cake" | "gift" | "event_booking" | "custom";
export type PrepHandling = "pickup" | "delivery" | "self_prepared" | "unknown";
export type PrepStatus = "suggested" | "confirmed" | "ordered" | "ready" | "picked_up" | "delivered" | "cancelled";
/** shared: 동반자와 함께 봄 · personal: 소유자만(민감하진 않음, 예: 잊지 않게 하는 개인 준비물) · secret: 서프라이즈 보호 대상 */
export type PrepVisibility = "shared" | "personal" | "secret";

export type PrepItem = {
  id: string;
  planId: string;
  category: PrepCategory;
  title: string;
  notes: string;
  relatedMainItemId?: string;
  deliverToItemId?: string;
  date: string;
  time?: string;
  leadTimeDays: number;
  orderDeadline?: string;
  handling: PrepHandling;
  handlingReason?: string;
  storageNote?: string;
  price?: number;
  priceConfidence: "estimate" | "provider_quote" | "unknown";
  status: PrepStatus;
  visibility: PrepVisibility;
  secretLabel?: string;
  secretDisclosure?: SecretDisclosure;
  reservationTaskId?: string;
  /** Real candidate found by automatic place discovery (flower/cake/gift shop, event venue). Undefined until discovery runs. */
  reality?: PlaceReality;
  createdAt: string;
  updatedAt: string;
};

export type HandoffKind = "search" | "gift" | "call" | "self";

export type PlanItemStatus = "proposed" | "confirmed" | "done";

export type PlaceReality = {
  source: "google_places" | "kakao_local" | "openstreetmap" | "curated";
  sourceLabel: string;
  placeId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  reviewHighlights?: string[];
  reviewAuthors?: string[];
  editorialSummary?: string;
  localIndependent?: boolean;
  chainName?: string;
  selectionSignals?: string[];
  priceLevel?: number;
  priceLabel: string;
  priceConfidence: "provider" | "estimated" | "unknown";
  openNow: boolean | null;
  openingHours: string[];
  businessStatus: "operational" | "closed_temporarily" | "closed_permanently" | "unknown";
  checkedAt: string;
  freshness: "live" | "recent" | "reference";
  imageKind: "place" | "reference";
  detailsUrl: string;
  websiteUrl?: string;
  reservationState: "supported" | "manual" | "walk_in" | "unknown";
  reservationLabel: string;
  bookingMethod?: BookingMethod;
  bookingProviderId?: string;
  reservationUrl?: string;
  phoneNumber?: string;
  phoneHours?: string[];
  distanceFromPreviousKm?: number;
  travelEstimateMinutes?: number;
  travelEstimateBasis?: "route" | "straight_line";
};

/**
 * "지금 뜨는 것"을 찾아오는 출처.
 *
 * culture_data / seoul_open_data 는 정부·지자체가 직접 등록한 데이터라 기간(시작~종료)이
 * 구조화돼 있다. naver_blog 는 그런 게 없다 — 최근에 글이 몰린다는 사실뿐이라 "화제인 것 같다"는
 * 추정까지만 할 수 있다. 이 둘을 한 타입으로 뭉개면 추정을 확정처럼 보여주게 되므로 나눠 둔다.
 */
export type DiscoverySource = "culture_data" | "seoul_open_data" | "naver_local" | "naver_blog";

export type DiscoveryConfidence =
  /** 기관이 등록한 기간·장소를 그대로 옮긴 것. 날짜를 단정해도 되는 유일한 경우. */
  | "official"
  /** 최근 글이 몰린다는 신호로 추린 것. 기간·가격을 단정하면 안 된다. */
  | "inferred";

export type DiscoveryItem = {
  id: string;
  title: string;
  source: DiscoverySource;
  sourceLabel: string;
  confidence: DiscoveryConfidence;
  /** 기관 데이터에서 온 경우에만 채운다. 블로그 글에서 날짜를 짐작해 넣지 않는다. */
  startDate?: string;
  endDate?: string;
  place?: string;
  address?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  summary?: string;
  imageUrl?: string;
  /** 원문으로 바로 갈 수 있는 링크. 우리가 확정 못 하는 건 사용자가 여기서 직접 본다. */
  detailsUrl?: string;
  /** 추정 신호를 화면에 그대로 보여주기 위한 근거("최근 2주 블로그 글 12건" 등). */
  signals: string[];
  checkedAt: string;
};

/**
 * 사용자가 발견(discovery) 항목("코스에 넣어볼까?")에 "가볼래" 등으로 반응하면 만들어진다.
 * DiscoveryItem 자체엔 전화번호·예약 URL이 없다 — 기관·블로그 데이터일 뿐 예약 채널이 아니라서다.
 * 그래서 이 예약은 항상 "공식 정보로 직접 확인·예약해" 안내로 시작하고, 있으면 detailsUrl로 보낸다.
 * 가짜 전화번호나 예약 성공을 만들어내지 않는다.
 */
export type DiscoveryBookingStatus = "interested" | "confirmed" | "cancelled";

export type DiscoveryBooking = {
  id: string;
  discoveryItemId: string;
  title: string;
  place?: string;
  startDate?: string;
  endDate?: string;
  detailsUrl?: string;
  confidence: DiscoveryConfidence;
  status: DiscoveryBookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReservationCapability = "automatic" | "assisted";
export type BookingMethod = "haruon_direct" | "external_online" | "external_platform" | "phone_only" | "walk_in" | "no_reservation" | "unsupported";
export type ExecutionTaskKind = "reservation" | "ticket" | "purchase" | "lodging" | "transport" | "rental_car" | "logistics";
export type ReservationTaskStatus = "not_started" | "checking" | "needs_information" | "needs_approval" | "needs_deposit" | "ready" | "user_action" | "executing" | "completed" | "booked" | "purchased" | "failed" | "phone_required" | "alternative_required" | "cancel_requested" | "refund_pending" | "refunded" | "unsupported";

export type ExecutionPrice = {
  currency: "KRW";
  estimatedAmount: number;
  confirmedTotalAmount?: number;
  prepayAmount?: number;
  onsiteAmount?: number;
  confidence: "estimate" | "range" | "provider_quote";
  quoteId?: string;
  checkedAt?: string;
};

export type ExecutionConfirmation = {
  source: "provider" | "user_report";
  confirmationId: string;
  confirmedAt: string;
  details?: string;
};

export type ExecutionProposedChange = {
  time?: string;
  title?: string;
  amount?: number;
  additionalCost?: number;
  cancellationTerms?: string;
  reason: string;
  requiresApproval: true;
};

export type ExecutionPrivacy = {
  requiredFields: Array<"name" | "phone" | "email">;
  approvedFields: Array<"name" | "phone" | "email">;
  disclosureApprovedAt?: string;
  purpose: string;
};

export type ExecutionApproval = {
  id: string;
  state: "not_requested" | "requested" | "granted" | "reapproval_required" | "expired";
  taskIds: string[];
  amount: number;
  currency: "KRW";
  requestedAt?: string;
  approvedAt?: string;
  approvalText?: string;
  termsFingerprint: string;
};

export type ReservationTask = {
  id: string;
  itemId: string;
  title: string;
  time: string;
  dayNumber?: number;
  kind: ExecutionTaskKind;
  bookingMethod: BookingMethod;
  capability: ReservationCapability;
  status: ReservationTaskStatus;
  providerLabel: string;
  bookingUrl: string;
  depositAmount?: number;
  explanation: string;
  availability: "unknown" | "checking" | "available" | "unavailable";
  price: ExecutionPrice;
  privacy: ExecutionPrivacy;
  phoneNumber?: string;
  phoneHours?: string[];
  phoneScript?: string;
  dependsOnTaskIds?: string[];
  itemFingerprint: string;
  confirmation?: ExecutionConfirmation;
  proposedChange?: ExecutionProposedChange;
  failureReason?: string;
};

export type ReservationOrder = {
  id: string;
  planId: string;
  createdAt: string;
  updatedAt: string;
  status: "not_started" | "checking" | "needs_information" | "needs_approval" | "needs_deposit" | "ready" | "partially_manual" | "executing" | "partially_completed" | "completed" | "failed" | "alternative_required";
  tasks: ReservationTask[];
  depositTotal: number;
  estimatedTotal: number;
  payableNow: number;
  onsiteEstimated: number;
  unconfirmedPriceTaskIds: string[];
  requestedItemIds: string[];
  requestedScope: "selection" | "whole_plan";
  approval?: ExecutionApproval;
  message: string;
};

export type PlanRequest = {
  request: string;
  recipient?: string;
  region?: string;
  departureRegion?: string;
  budget?: number;
  targetDate?: string;
  partySize?: number;
  transport?: TransportMode;
  ageBand?: AgeBand;
  preferences?: string[];
  constraints?: string[];
  planScope?: PlanScope;
  tripDays?: number;
  tripNights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  arrivalTime?: string;
  returnDepartureTime?: string;
  lodgingPreference?: string;
  lodgingIncludedInBudget?: boolean;
  requestKind?: RequestKind;
  singleCategory?: PlanCategory;
  requestedCategories?: PlanCategory[];
  excludedCategories?: PlanCategory[];
  explicitUnknowns?: string[];
  personMemoryUpdate?: PersonMemoryUpdate;
  intakeConversation?: PlanningChatMessage[];
  personProfile?: PersonProfile;
  desiredMoods?: ExperienceMood[];
  availabilityStartTime?: string;
  availabilityEndTime?: string;
  scheduleDensity?: ScheduleDensity;
  densitySpecified?: boolean;
  homeByTime?: string;
  homeTravelMinutes?: number;
  temporaryCondition?: TemporaryCondition;
  budgetUsage?: "reserve" | "full";
  /** 밥·카페처럼 "몇 시에 먹고 싶은지"가 결과를 바꾸는 항목의 희망 시간. */
  mealTime?: string;
  /** 예약한 꽃·케이크·선물을 언제 찾으러 갈지. */
  pickupTime?: string;
  /**
   * 사용자가 상호명을 콕 집어 말한 가게들("까사올리브").
   * 조건 탐색과 달리 이건 대체 불가다 — 못 찾으면 비슷한 가게로 채우지 말고 못 찾았다고 말해야 한다.
   */
  namedPlaces?: string[];
};

export type TransportMode = "public_transit" | "car" | "walking" | "unknown";

export type ParsedSituation = {
  occasion: Occasion;
  occasionLabel: string;
  recipient: string;
  region: string;
  departureRegion?: string;
  budget: number;
  targetDate: string;
  partySize: number;
  urgency: "today" | "tomorrow" | "soon" | "planned";
  preferredTime: string;
  startTime: string;
  tone: "romantic" | "warm" | "lively" | "calm";
  transport: TransportMode;
  indoorPreference: boolean;
  preferences: string[];
  constraints: string[];
  ageBand: AgeBand;
  desiredMoods: ExperienceMood[];
  planScope: PlanScope;
  singleCategory?: PlanCategory;
  tripDays?: number;
  tripNights?: number;
  needsLodging: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  arrivalTime?: string;
  returnDepartureTime?: string;
  lodgingPreference?: string;
  lodgingIncludedInBudget: boolean;
  requestKind: RequestKind;
  requestedCategories: PlanCategory[];
  excludedCategories: PlanCategory[];
  explicitUnknowns: string[];
  personMemoryUpdate?: PersonMemoryUpdate;
  limitedEventPriority: boolean;
  personProfile?: PersonProfile;
  availabilityEndTime?: string;
  scheduleDensity: ScheduleDensity;
  densitySpecified: boolean;
  homeByTime?: string;
  homeTravelMinutes?: number;
  temporaryCondition: TemporaryCondition;
  budgetUsage: "reserve" | "full";
  homeTransportOverride?: TransportMode;
  /** 사용자가 상호명으로 지목한 가게들. 대체 불가 — 없으면 없다고 말한다. */
  namedPlaces: string[];
};

export type MissingSituationField = "recipient" | "date" | "region" | "departure" | "budget" | "partySize" | "tripLength" | "preference" | "transport" | "lodgingPreference" | "arrivalTime" | "returnTime" | "mustHave" | "availabilityTime" | "density" | "mealTime" | "pickupTime";

export type PlanningQuestionKey = MissingSituationField | null;

export type PlanningChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type PlanningConversationResult = {
  draft: PlanRequest;
  understanding: SituationUnderstanding;
  reply: string;
  ready: boolean;
  questionKey: PlanningQuestionKey;
  quickReplies: string[];
  decisionSource?: "structured_ai" | "deterministic_fallback";
};

export type SituationUnderstanding = {
  situation: ParsedSituation;
  recognized: Array<{ label: string; value: string }>;
  missing: MissingSituationField[];
  confidence: number;
  message: string;
};

export type PlanOption = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  durationMinutes: number;
  provider: string;
  handoffKind: HandoffKind;
  href: string;
  badge?: string;
  notes: string[];
  location: string;
  imageUrl: string;
  referenceImageUrl?: string;
  imageAlt: string;
  reason: string;
  venueType: "indoor" | "outdoor" | "mixed";
  reservationRequired: boolean;
  reality?: PlaceReality;
  experience?: ExperienceProfile;
};

export type PlanItem = PlanOption & {
  category: PlanCategory;
  categoryLabel: string;
  icon: PlanCategory;
  time: string;
  status: PlanItemStatus;
  dayNumber?: number;
  alternatives: PlanOption[];
  travelFromPrevious?: {
    minutes: number;
    mode: "도보" | "대중교통" | "차량";
    note: string;
    walkingMinutes?: number;
    transfers?: number;
    fatigue?: "low" | "medium" | "high";
    weatherExposure?: "low" | "medium" | "high" | "unknown";
  };
  durationRange?: {
    minimumMinutes: number;
    recommendedMinutes: number;
    leisurelyMinutes: number;
    source: "category" | "place" | "user";
  };
  bufferAfterMinutes?: number;
  endTime?: string;
  placeLocked?: boolean;
  timeLocked?: boolean;
  lockReason?: string;
  visibility?: ItemVisibility;
  secretLabel?: string;
  secretDisclosure?: SecretDisclosure;
  liveState?: LiveItemState;
  actualStartTime?: string;
  segmentTransportOverride?: TransportMode;
};

export type PlanRevision = {
  id: string;
  instruction: string;
  summary: string;
  createdAt: string;
  changedCategories: PlanCategory[];
};

export type PlanLogisticsItem = {
  id: string;
  dayNumber: number;
  time: string;
  kind: "arrival" | "checkin" | "checkout" | "luggage" | "departure";
  title: string;
  note: string;
};

export type PlanVersion = {
  id: string;
  createdAt: string;
  instruction: string;
  summary: string;
  situation: ParsedSituation;
  title: string;
  summaryText: string;
  items: PlanItem[];
  logistics: PlanLogisticsItem[];
  subtotal: number;
  reserve: number;
  total: number;
  budget: number;
  budgetRemaining: number;
  experienceFlow?: DajeongPlan["experienceFlow"];
  discovery?: DajeongPlan["discovery"];
  schedule?: DajeongPlan["schedule"];
};

export type DajeongPlan = {
  id: string;
  createdAt: string;
  sourceRequest: string;
  situation: ParsedSituation;
  title: string;
  summary: string;
  items: PlanItem[];
  subtotal: number;
  reserve: number;
  total: number;
  budget: number;
  budgetRemaining: number;
  readiness: number;
  status: "draft" | "confirmed" | "completed";
  notice: string;
  revisions: PlanRevision[];
  versions?: PlanVersion[];
  logistics?: PlanLogisticsItem[];
  execution?: ReservationOrder;
  conversation?: ConciergeMessage[];
  experienceFlow?: {
    labels: string[];
    narrative: string;
    highlightItemId?: string;
  };
  discovery?: {
    status: "live" | "partial" | "unavailable";
    sourceLabel: string;
    checkedAt: string;
    realPlaceCount: number;
    message: string;
    /** 사용자가 이름으로 지목했지만 실제로 찾지 못한 가게. 대신 다른 가게를 채우지 않았다는 표시다. */
    unresolvedNamedPlaces?: string[];
  };
  schedule?: {
    density: ScheduleDensity;
    dayWindows: Array<{ dayNumber: number; startTime: string; endTime: string; source: "availability" | "travel" | "default" }>;
    estimatedEndTime: string;
    estimatedHomeArrival?: string;
    homeTravelMinutes?: number;
    reserveRatio: number;
    warnings: string[];
    weather: WeatherContext;
  };
  ownerId?: string;
  ownerName?: string;
  planKind?: PlanKind;
  companionId?: string;
  companionName?: string;
  sharedVersion?: number;
  lastEditedBy?: string;
  changeLog?: PlanChangeLogEntry[];
  prep?: PrepItem[];
  prepAsked?: boolean;
  prepDeclined?: boolean;
  /** 이 계획의 날짜·지역과 겹치는 기간 한정 행사(경복궁 야간개장류). 일정에 자동으로 넣지 않고 참고용으로만 들고 있는다. */
  discoveredEvents?: DiscoveryItem[];
  /** 사용자가 발견 항목에 관심을 보여 예약 흐름에 올린 것들. */
  discoveryBookings?: DiscoveryBooking[];
  notificationLevel?: "normal" | "content_hidden" | "off";
  /**
   * Whichever local identity (anonymous device id or account id) was active in this browser when
   * the plan was first saved to localStorage. Never sent to the server or trusted as an access
   * check there — it only scopes what this browser's plan list shows, so that logging into a
   * different account on a shared computer doesn't surface the previous person's saved plans.
   */
  localOwnerId?: string;
};

export type ConciergeMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "done" | "searching" | "proposal" | "error";
  createdAt: string;
  visibility?: ItemVisibility;
  phase?: "planning" | "live";
  relatedItemId?: string;
  authorId?: string;
  authorLabel?: string;
};

export type PlanChangeProposal = {
  id: string;
  message: string;
  reason: string;
  plan: DajeongPlan;
};

export type PaceUpdate = {
  scope: PaceFeedbackScope;
  density?: ScheduleDensity;
  placesPerDay?: number;
  note: string;
};

export type PlanRevisionResult = {
  plan: DajeongPlan;
  message: string;
  changedCategories: PlanCategory[];
  proposal?: PlanChangeProposal;
  searchedRealPlaces?: number;
  profileUpdate?: PersonMemoryUpdate;
  paceUpdate?: PaceUpdate;
};

// ── Proactive notifications ──────────────────────────────────────────────

export type NotificationKind =
  | "departure"
  | "prep_deadline"
  | "prep_pickup"
  | "weather_change"
  | "homebound"
  | "reservation_risk"
  | "checkin_checkout";

export type NotificationPriority = "critical" | "high" | "normal" | "low";

export type NotificationStatus = "scheduled" | "sent" | "cancelled" | "superseded" | "failed";

/** Same 3-level scheme as PrepVisibility/SecretDisclosure, applied to delivery — "normal" shows
 * the real title/body, "content_hidden" replaces both with a generic line before it ever leaves
 * the server, "off" means this kind of notification is never generated for this person at all. */
export type NotificationPrivacyLevel = "normal" | "content_hidden" | "off";

export type DajeongNotification = {
  id: string;
  planId: string;
  /** The plan version this notification's content was computed from — a later version
   * invalidates it (see notification-engine's supersede logic), so a stale notification
   * referencing since-changed or since-deleted plan state can never fire. */
  planVersion: number;
  /** Who this notification is FOR. Never an aggregate — one row per recipient, computed from
   * that recipient's own redacted view of the plan, so a companion's rows are structurally
   * incapable of referencing anything the owner has not chosen to share. */
  targetPersonId: string;
  kind: NotificationKind;
  priority: NotificationPriority;
  status: NotificationStatus;
  /** One active (scheduled) notification per dedupe key at a time — a recompute that finds an
   * existing scheduled row with the same key either updates it in place or supersedes it,
   * instead of stacking a second reminder for the same underlying event. */
  dedupeKey: string;
  scheduledFor: string;
  title: string;
  body: string;
  privacyAtSend: "normal" | "content_hidden";
  deepLink: string;
  relatedItemId?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  supersededBy?: string;
  failureReason?: string;
};

export type PushSubscriptionKeys = { p256dh: string; auth: string };

export type PushSubscriptionRecord = {
  id: string;
  personId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  userAgent?: string;
  createdAt: string;
};

export type NotificationCategoryToggles = {
  departure: boolean;
  prep: boolean;
  execution: boolean;
  weather: boolean;
  sharedPlanChanges: boolean;
  proactiveSuggestions: boolean;
};

export type NotificationPreferences = {
  personId: string;
  masterEnabled: boolean;
  categories: NotificationCategoryToggles;
  secretPrivacyLevel: NotificationPrivacyLevel;
  /** Local HH:mm strings, applied in the plan's own region context (Asia/Seoul by default). */
  quietHours?: { startTime: string; endTime: string };
  updatedAt: string;
};
