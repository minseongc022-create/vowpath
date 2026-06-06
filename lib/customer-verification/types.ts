export type CustomerVerificationStatus =
  | "pending_response"
  | "verified"
  | "needs_review"
  | "unverified";

export type CustomerVerificationResponse = "yes" | "no";

export type CustomerVerificationTimelineEntry = {
  at: string;
  message: string;
};

export type CustomerVerificationRecord = {
  id: string;
  userId: string;
  bookingId: string;
  callId?: string;
  customerPhone: string;
  shopName: string;
  status: CustomerVerificationStatus;
  sentAt: string;
  reminderSentAt?: string;
  respondedAt?: string;
  response?: CustomerVerificationResponse;
  correctionToken?: string;
  snapshot: {
    customerName: string;
    address: string;
    issueType: string;
  };
  triggerReasons: string[];
  timeline: CustomerVerificationTimelineEntry[];
};

export type CustomerVerificationView = {
  bookingId: string;
  status: CustomerVerificationStatus;
  statusLabel: string;
  badgeLabel: string;
  badgeTone: "green" | "orange" | "amber" | "slate";
  sentAt: string | null;
  respondedAt: string | null;
  response: CustomerVerificationResponse | null;
  responseLabel: string | null;
  timeline: CustomerVerificationTimelineEntry[];
};
