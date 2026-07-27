import type { BookingMode, RequestStatus } from "./booking-policy";
import type {
  ForwardingProviderId,
  ForwardingScenarioId,
} from "./forwarding-guides";
import type { PrioritySource, ServicePriority } from "./service-priority";
import type { ShopVertical } from "./shop-vertical.js";
import type { EstimateDocument } from "./estimate-document";

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
  /** Free estimate lead vs emergency/service dispatch request. */
  requestKind?: "estimate" | "service";
  /** Owner-entered quote/estimate amount, in cents. Drives the unbooked-quote follow-up. */
  quotedAmountCents?: number;
  quotedAt?: string;
  /** When the quote amount was actually texted to the customer. */
  quoteSentToCustomerAt?: string;
  quoteFollowUpSentAt?: string;
  /** Automated chase SMS timestamps (48h, 7d, 14d). Legacy: quoteFollowUpSentAt = first entry. */
  quoteChaseSentAt?: string[];
  /** Full on-site / itemized estimate document. */
  estimateDoc?: EstimateDocument;
  /** Standalone ClosePing quote (not Effiroad dispatch intake). */
  productSource?: "closeping" | "effiroad";
  /** E.164 or normalized US phone for ClosePing SMS. */
  customerPhone?: string;
  /** Owner attested SMS consent when sending quote via ClosePing. */
  closepingChaseConsentAt?: string;
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
  /** IANA timezone for AI answer hours, visit windows, and on-call weekday. */
  shopTimezone?: string;
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
  /** "Webhooks by Zapier" Catch Hook URL — every new request POSTs its details here. */
  zapierWebhookUrl?: string;
  /** Business street address shown on printed/shared estimates. */
  businessAddress?: string;
  /** State contractor / restoration license # when required. */
  licenseNumber?: string;
  /** IICRC firm number (restoration shops). */
  iicrcFirmNumber?: string;
  /** Default sales tax % applied on new estimates (0–30). */
  defaultTaxRatePercent?: number;
  /** How many days a new estimate stays valid (default 14). */
  estimateValidityDays?: number;
  /** Default notes on new estimates. */
  estimateNotes?: string;
  /** Default exclusions on new estimates. */
  estimateExclusions?: string;
  /** Default hourly labor rate on new line items (cents). */
  defaultLaborRateCents?: number;
  /** Printed payment terms (deposit, due date). */
  estimatePaymentTerms?: string;
};

export type { ShopVertical };
