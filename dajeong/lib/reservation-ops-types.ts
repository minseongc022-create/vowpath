import type { DajeongPlan, ReservationOrder } from "./types";

export type ConstraintStrength = "HARD" | "FLEXIBLE" | "PREFERRED";

export type ReservationConstraint = {
  field: string;
  value: string | number | boolean;
  strength: ConstraintStrength;
  toleranceMinutes?: number;
  note?: string;
};

export type ReservationContact = {
  name: string;
  phone: string;
  approvedFields: Array<"name" | "phone">;
  approvedAt: string;
  purpose: string;
};

export type ReservationGoal = {
  venueName: string;
  venuePhone: string;
  venueAddress?: string;
  date: string;
  time: string;
  partySize: number;
  reservationName: string;
  category: string;
  constraints: ReservationConstraint[];
  specialRequests: string[];
};

export type StructuredReservationStatus =
  | "confirmed"
  | "unavailable"
  | "needs_user_action"
  | "walk_in_only"
  | "duplicate_found"
  | "wrong_number"
  | "inconclusive";

export type MoneyCommitment = {
  amount: number;
  currency: "KRW";
  method?: "deposit" | "minimum_spend" | "seat_fee" | "preorder" | "other";
  paymentMethod?: "bank_transfer" | "payment_link" | "card" | "unknown";
  paymentLink?: string;
  accountHint?: string;
  deadline?: string;
};

export type StructuredReservationResult = {
  status: StructuredReservationStatus;
  confirmedDate?: string;
  confirmedTime?: string;
  alternativeDates?: string[];
  alternativeTimes?: string[];
  partySize?: number;
  reservationName?: string;
  venue: string;
  seat?: string;
  tableArrangement?: string;
  durationMinutes?: number;
  deposit?: MoneyCommitment;
  minimumSpend?: MoneyCommitment;
  additionalFees?: MoneyCommitment[];
  preorder?: string[];
  cancellationPolicy?: string;
  operatingConstraints?: string[];
  venuePolicies?: {
    parking?: string;
    cake?: string;
    corkage?: string;
    children?: string;
    pets?: string;
  };
  followUp?: { channel: "sms" | "phone" | "payment_link" | "bank_transfer" | "other"; status: "expected" | "received" | "required"; details?: string };
  specialConditions?: string[];
  failureReason?: string;
  requiresUserAction: boolean;
  retryRecommended: boolean;
  confidence: number;
  finalReadbackConfirmed: boolean;
  contradiction?: string;
  transcriptCheckedAt?: string;
};

export type ReservationJobStatus =
  | "queued"
  | "calling"
  | "awaiting_result"
  | "retry_scheduled"
  | "needs_user_action"
  | "succeeded"
  | "failed";

export type CallAttempt = {
  attempt: number;
  provider: string;
  externalCallId?: string;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  providerStatus?: string;
  hangupCause?: string;
  hangupSource?: string;
  sipResponseCode?: number;
  transcriptStatus?: "not_requested" | "pending" | "processing" | "completed" | "failed";
};

export type ReservationJob = {
  id: string;
  batchId: string;
  ownerId: string;
  planId: string;
  orderId: string;
  taskId: string;
  itemId: string;
  provider: "clawops_phone" | "haruwith_direct" | "partner_online";
  goal: ReservationGoal;
  contact: ReservationContact;
  status: ReservationJobStatus;
  queuePosition?: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  targetDeadlineAt?: string;
  absoluteDeadlineAt?: string;
  retryAt?: string;
  attempts: CallAttempt[];
  result?: StructuredReservationResult;
  failureReason?: string;
  idempotencyKey: string;
};

export type ReservationBatchStatus = "queued" | "running" | "needs_user_action" | "partially_completed" | "completed" | "failed";

export type ReservationBatch = {
  id: string;
  ownerId: string;
  accessTokenHash: string;
  planId: string;
  orderId: string;
  status: ReservationBatchStatus;
  jobIds: string[];
  plan: DajeongPlan;
  order: ReservationOrder;
  createdAt: string;
  updatedAt: string;
  message: string;
  idempotencyKey: string;
  attributionTokens?: string[];
};

export type ReservationNotificationType = "reservation_complete" | "reservation_partial" | "reservation_action_required" | "reservation_failed";

export type ReservationNotification = {
  id: string;
  ownerId: string;
  batchId: string;
  type: ReservationNotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  delivery: "in_app" | "provider_pending" | "delivered" | "failed";
  deliveryAttempts?: number;
  nextDeliveryAt?: string;
  lastDeliveryError?: string;
};

export type ReservationMetricEvent = {
  id: string;
  type: "request" | "call_started" | "call_finished" | "retry" | "result" | "queue_wait";
  jobId?: string;
  batchId?: string;
  at: string;
  value?: number;
  tags?: Record<string, string | number | boolean>;
};

export type ReservationPersistentState = {
  batches: Record<string, ReservationBatch>;
  jobs: Record<string, ReservationJob>;
  idempotency: Record<string, string>;
  webhookEvents: Record<string, string>;
  notifications: ReservationNotification[];
  metrics: ReservationMetricEvent[];
};

export function emptyReservationState(): ReservationPersistentState {
  return { batches: {}, jobs: {}, idempotency: {}, webhookEvents: {}, notifications: [], metrics: [] };
}
