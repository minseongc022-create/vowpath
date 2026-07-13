import type { BookingDetail } from "@/lib/booking-detail";
import type { CallRecord } from "@/lib/operations-analytics";
import type { JobCard } from "@/lib/types";
import { buildBookingDetail } from "@/lib/booking-detail";
import { buildRecentBookingsList } from "@/lib/recent-bookings";
import type { RequestStatus } from "@/lib/booking-policy";

const DEMO_CALL_ID = "demo-call-mike-wilson";

export const DEMO_CALL: CallRecord = {
  id: DEMO_CALL_ID,
  from: "+15125550192",
  callbackPhone: "+15125550192",
  customerName: "Mike Wilson",
  address: "4821 Oak Drive, Austin, TX 78745",
  symptom: "Sewage backup — water rising in basement",
  issueType: "sewage_backup",
  priority: "P1",
  servicePriority: "emergency",
  priorityReasons: ["Active flooding", "Sewage backup"],
  prioritySource: "ai",
  transcript:
    "AI: Hi there, thanks for calling Ridgeline Restoration! What's going on?\n" +
    "Caller: Water's flooding my basement through the floor drain.\n" +
    "AI: I'm really glad you called — we're gonna take care of this. Can I get your name and address?\n" +
    "Caller: Mike Wilson, 4821 Oak Drive, Austin.\n" +
    "AI: Got it, Mike. I'm flagging this urgent and alerting the team now.\n" +
    "AI: You're in good hands — a tech is on the way.",
  arrivalWindow: "ASAP — on-call crew",
  recordingUrl: "/demo/sample-call-recording.mp3",
  qualityScore: 94,
  qualityReasoning: "Clear emergency intake. Address and damage type verified.",
  confidence: { customerName: 96, address: 91, serviceLocation: 91, issueType: 94 },
  verifiedFields: { customerName: true, address: true, serviceLocation: true, issueType: true },
  verificationComplete: true,
  createdAt: new Date().toISOString(),
};

export const DEMO_JOB: JobCard = {
  id: "demo-job-001",
  sourceCallId: DEMO_CALL_ID,
  priority: "P1",
  symptom: "Sewage backup — water rising in basement",
  customerName: "Mike Wilson",
  address: "4821 Oak Drive, Austin, TX 78745",
  arrivalWindow: "ASAP — on-call crew",
  status: "pending_review",
  createdAt: DEMO_CALL.createdAt,
};

export const DEMO_REQUEST_STATUSES: Record<string, RequestStatus> = {
  [`call-${DEMO_CALL_ID}`]: "pending_review",
};

export function buildDemoBookingDetail(): BookingDetail {
  const bookings = buildRecentBookingsList(
    [DEMO_JOB],
    [],
    [DEMO_CALL],
    5,
    DEMO_REQUEST_STATUSES,
  );
  return buildBookingDetail(bookings[0], [DEMO_CALL], [], DEMO_REQUEST_STATUSES);
}
