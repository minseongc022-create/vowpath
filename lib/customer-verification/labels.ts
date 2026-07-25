import type {
  CustomerVerificationResponse,
  CustomerVerificationStatus,
  CustomerVerificationView,
} from "./types";
import type { CustomerVerificationRecord } from "./types";
import { isEnglishUi } from "../locale";

const STATUS_LABELS_EN: Record<CustomerVerificationStatus, string> = {
  pending_response: "Awaiting response",
  verified: "Verified",
  needs_review: "Needs Review",
  unverified: "Unverified",
};

const STATUS_LABELS_KO: Record<CustomerVerificationStatus, string> = {
  pending_response: "확인 대기",
  verified: "확인 완료",
  needs_review: "검토 필요",
  unverified: "미확인",
};

const BADGE_LABELS_EN: Record<CustomerVerificationStatus, string> = {
  pending_response: "Awaiting response",
  verified: "Customer verified",
  needs_review: "Customer correction",
  unverified: "Awaiting response",
};

const BADGE_LABELS_KO: Record<CustomerVerificationStatus, string> = {
  pending_response: "확인 대기",
  verified: "고객 확인 완료",
  needs_review: "고객 수정 요청",
  unverified: "확인 대기",
};

function statusLabels(): Record<CustomerVerificationStatus, string> {
  return isEnglishUi() ? STATUS_LABELS_EN : STATUS_LABELS_KO;
}

function badgeLabels(): Record<CustomerVerificationStatus, string> {
  return isEnglishUi() ? BADGE_LABELS_EN : BADGE_LABELS_KO;
}

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
    statusLabel: statusLabels()[record.status],
    badgeLabel: badgeLabels()[record.status],
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
  return new Date(iso).toLocaleString(isEnglishUi() ? "en-US" : "ko-KR", {
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
