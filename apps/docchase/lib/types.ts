import type { PlanId } from "./plans";

export type DocKind =
  | "통장사본"
  | "카드매출"
  | "세금계산서"
  | "현금영수증"
  | "급여대장"
  | "기타증빙";

export type ChaseStatus =
  | "대기"
  | "1차발송"
  | "2차발송"
  | "제출완료"
  | "해당없음"
  | "지연";

export type CallOutcome = "통화약속" | "부재" | "거부" | "받음확인" | null;

export type SubmittedFile = {
  id: string;
  name: string;
  size: number;
  dataUrl?: string;
  uploadedAt: string;
  docKind?: DocKind | "기타";
};

export type ClientAccount = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  docs: DocKind[];
  deadlineDay: number;
  status: ChaseStatus;
  lastSentAt?: string;
  submittedAt?: string;
  notes?: string;
  submitToken: string;
  replyToken: string;
  files: SubmittedFile[];
  /** 담당 사무원 (소형 팀) */
  assignee?: string;
  /** 수임처 원탭 회신 */
  clientReply?: "이미냈어요" | "해당없음" | null;
  clientRepliedAt?: string;
  /** 알림톡 후에도 안 되면 전화 큐 */
  inCallQueue?: boolean;
  callOutcome?: CallOutcome;
  callNote?: string;
};

export type OfficeProfile = {
  officeName: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: PlanId;
  /** Prefer live Solapi when server configured */
  liveSend?: boolean;
};

export type ActivityItem = {
  id: string;
  at: string;
  message: string;
};

export type ScheduleSettings = {
  enabled: boolean;
  d7: boolean;
  d3: boolean;
  d1: boolean;
};

export type AppState = {
  profile: OfficeProfile;
  clients: ClientAccount[];
  monthLabel: string;
  activity: ActivityItem[];
  schedule: ScheduleSettings;
  messagesUsed: number;
};

export const DOC_KINDS: DocKind[] = [
  "통장사본",
  "카드매출",
  "세금계산서",
  "현금영수증",
  "급여대장",
  "기타증빙",
];

export const STATUS_ORDER: ChaseStatus[] = [
  "지연",
  "2차발송",
  "1차발송",
  "대기",
  "제출완료",
  "해당없음",
];

export function newSubmitToken() {
  return `t_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function newReplyToken() {
  return `r_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function isDoneStatus(status: ChaseStatus) {
  return status === "제출완료" || status === "해당없음";
}
