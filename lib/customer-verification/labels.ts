import type {
  CustomerVerificationResponse,
  CustomerVerificationStatus,
  CustomerVerificationView,
} from "./types";
import type { CustomerVerificationRecord } from "./types";

const STATUS_LABELS: Record<CustomerVerificationStatus, string> = {
  pending_response: "확인 대기",
  verified: "Verified",
  needs_review: "Needs Review",
  unverified: "Unverified",
};

const BADGE_LABELS: Record<CustomerVerificationStatus, string> = {
  pending_response: "확인 대기",
  verified: "고객 확인 완료",
  needs_review: "고객 수정 요청",
  unverified: "확인 대기",
};

const BADGE_TONE: Record<
  CustomerVerificationStatus,
  CustomerVerificationView["badgeTone"]
> = {
  pending_response: "amber",
  verified: "green",
  needs_review: "orange",
  unverified: "amber",
};

export function toCustomerVerificationView(
  record: CustomerVerificationRecord | null | undefined,
): CustomerVerificationView | null {
  if (!record) return null;
  const responseLabel =
    record.response === "yes"
      ? "YES"
      : record.response === "no"
        ? "NO"
        : null;
  return {
    bookingId: record.bookingId,
    status: record.status,
    statusLabel: STATUS_LABELS[record.status],
    badgeLabel: BADGE_LABELS[record.status],
    badgeTone: BADGE_TONE[record.status],
    sentAt: record.sentAt,
    respondedAt: record.respondedAt ?? null,
    response: record.response ?? null,
    responseLabel,
    timeline: record.timeline,
  };
}

export function formatVerificationDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function responseDisplay(
  response: CustomerVerificationResponse | null,
): string {
  if (response === "yes") return "YES";
  if (response === "no") return "NO";
  return "—";
}
