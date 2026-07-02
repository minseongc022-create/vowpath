import type { BookingMode, RequestStatus } from "./booking-policy";
import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "./forwarding-guides";
import type { PrioritySource, ServicePriority } from "./service-priority";
import type { ShopVertical } from "./shop-vertical.js";

export type JobPriority = "P1" | "P2" | "P3";

export type JobCard = {
  id: string;
  jobberJobId?: string;
  sourceCallId?: string;
  /** Stored priority: P1 | P2 | P3 (source of truth in DB). */
  priority: JobPriority;
  /** Derived tier for display (synced from priority on read/write). */
  servicePriority?: ServicePriority;
  priorityReasons?: string[];
  prioritySource?: PrioritySource;
  priorityOverriddenAt?: string;
  symptom: string;
  customerName: string;
  address: string;
  arrivalWindow: string;
  status: RequestStatus;
  createdAt: string;
  /** Owner-entered quote/estimate amount, in cents. Drives the unbooked-quote follow-up. */
  quotedAmountCents?: number;
  quotedAt?: string;
  quoteFollowUpSentAt?: string;
};

export type { BookingMode, RequestStatus };

export type AnswerWindow = {
  id: string;
  label: string;
  value: string;
};

export type ShopState = {
  scheduleWindows: AnswerWindow[];
  answerScheduleActive: boolean;
  /** When true, AI answers 24/7 for calls that reach Effiroad. */
  scheduleAlwaysOn?: boolean;
  jobberConnected: boolean;
  /** Settings wizard: user confirmed Jobber step after OAuth connect */
  jobberSetupConfirmed?: boolean;
  /** User chose to skip optional Jobber connect in settings */
  jobberSkipped?: boolean;
  forwardingDone: boolean;
  forwardingScenario?: ForwardingScenarioId;
  forwardingProvider?: ForwardingProviderId;
  onboardingComplete: boolean;
  /** Mode A: request_only (MVP). Mode B: auto_booking (future). */
  bookingMode?: BookingMode;
  /** Trade vertical — drives AI prompts, dispatch rules, and intake fields. Default: restoration. */
  vertical?: ShopVertical;
  /** KPI cards the owner has chosen to show on the dashboard. */
  dashboardVisibleMetrics?: string[];
  /** Google review link — customers get a one-tap SMS ask when a job is marked completed. */
  googleReviewUrl?: string;
};

export type { ShopVertical };
