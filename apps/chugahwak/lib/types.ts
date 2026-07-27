import type { PlanId } from "./plans";

export type CoStatus = "작성중" | "보냄" | "승인" | "거절" | "청구반영";

export type LineItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

export type ChangeOrder = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  reason: string;
  items: LineItem[];
  daysExtend: number;
  status: CoStatus;
  token: string;
  createdAt: string;
  sentAt?: string;
  decidedAt?: string;
  clientNote?: string;
  photoNote?: string;
};

export type Project = {
  id: string;
  name: string;
  clientName: string;
  phone: string;
  address: string;
  baseContractWon: number;
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
  orders: ChangeOrder[];
  activity: Activity[];
};

export function newToken() {
  return `c_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function lineTotal(item: LineItem) {
  return item.qty * item.unitPrice;
}

export function orderTotal(order: ChangeOrder) {
  return order.items.reduce((s, i) => s + lineTotal(i), 0);
}

export function formatWon(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}
