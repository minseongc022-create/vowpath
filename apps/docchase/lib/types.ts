export type DocKind =
  | "통장사본"
  | "카드매출"
  | "세금계산서"
  | "현금영수증"
  | "급여대장"
  | "기타증빙";

export type ChaseStatus = "대기" | "1차발송" | "2차발송" | "제출완료" | "지연";

export type ClientAccount = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  docs: DocKind[];
  deadlineDay: number; // day of month
  status: ChaseStatus;
  lastSentAt?: string;
  submittedAt?: string;
  notes?: string;
};

export type OfficeProfile = {
  officeName: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: "starter" | "standard" | "pro";
};

export type AppState = {
  profile: OfficeProfile;
  clients: ClientAccount[];
  monthLabel: string;
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
];
