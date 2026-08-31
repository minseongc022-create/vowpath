import type { PlanId } from "./plans";

export type AppStatus = "작성중" | "보냄" | "승인" | "수정요청" | "거절";

export type LineItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  /** 0–100 이번 청구 진도(%) — 선택 */
  pctComplete?: number;
};

export type PayApp = {
  id: string;
  projectId: string;
  number: number;
  period: string; // YYYY-MM
  title: string;
  note: string;
  items: LineItem[];
  /** 이번 청구액(품목 합과 다를 수 있음 — 일괄 기성) */
  thisPeriodWon: number;
  previousBilledWon: number;
  retainageWon: number;
  status: AppStatus;
  token: string;
  createdAt: string;
  sentAt?: string;
  decidedAt?: string;
  approverNote?: string;
  photoNote?: string;
};

export type Project = {
  id: string;
  name: string;
  /** 원청·발주·감리 등 승인자 */
  approverName: string;
  phone: string;
  address: string;
  contractWon: number;
  createdAt: string;
};

export type Profile = {
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: PlanId;
};

export type Activity = { id: string; at: string; message: string };

export type AppState = {
  profile: Profile;
  projects: Project[];
  apps: PayApp[];
  activity: Activity[];
};

export function newToken() {
  return `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function lineTotal(item: LineItem) {
  return item.qty * item.unitPrice;
}

export function itemsTotal(app: PayApp) {
  return app.items.reduce((s, i) => s + lineTotal(i), 0);
}

/** 청구 화면·합계에 쓰는 이번 기성액 */
export function claimAmount(app: PayApp) {
  if (app.thisPeriodWon > 0) return app.thisPeriodWon;
  return itemsTotal(app);
}

export function netPayable(app: PayApp) {
  return Math.max(0, claimAmount(app) - app.retainageWon);
}

export function formatWon(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}
