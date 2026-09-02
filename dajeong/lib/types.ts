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

export type HandoffKind = "search" | "gift" | "call" | "self";

export type PlanItemStatus = "proposed" | "confirmed" | "done";

export type PlaceReality = {
  source: "google_places" | "openstreetmap" | "curated";
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
};

export type MissingSituationField = "recipient" | "date" | "region" | "departure" | "budget" | "partySize" | "tripLength" | "preference" | "transport" | "lodgingPreference" | "arrivalTime" | "returnTime" | "mustHave" | "availabilityTime" | "density";

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
};

export type ConciergeMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "done" | "searching" | "proposal" | "error";
  createdAt: string;
};

export type PlanChangeProposal = {
  id: string;
  message: string;
  reason: string;
  plan: DajeongPlan;
};

export type PlanRevisionResult = {
  plan: DajeongPlan;
  message: string;
  changedCategories: PlanCategory[];
  proposal?: PlanChangeProposal;
  searchedRealPlaces?: number;
  profileUpdate?: PersonMemoryUpdate;
};
