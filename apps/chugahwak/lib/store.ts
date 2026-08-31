import { getPlan } from "./plans";
import type { AppState, ChangeOrder, Project } from "./types";
import { newToken, orderTotal } from "./types";

const KEY = "chugahwak.v1";

export const DEMO_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "성수 카페 리뉴얼",
    clientName: "김사장",
    phone: "010-2345-1100",
    address: "서울 성동구 성수동",
    baseContractWon: 48000000,
    createdAt: "2026-06-01T09:00:00+09:00",
  },
  {
    id: "p2",
    name: "판교 오피스 파티션",
    clientName: "박실장",
    phone: "010-8890-2211",
    address: "경기 성남시 분당구",
    baseContractWon: 22000000,
    createdAt: "2026-06-12T09:00:00+09:00",
  },
  {
    id: "p3",
    name: "한남 주택 리모델링",
    clientName: "이대표",
    phone: "010-5512-7788",
    address: "서울 용산구 한남동",
    baseContractWon: 95000000,
    createdAt: "2026-07-01T09:00:00+09:00",
  },
];

export const DEMO_ORDERS: ChangeOrder[] = [
  {
    id: "co1",
    projectId: "p1",
    number: 1,
    title: "바 카운터 석재 변경",
    reason: "발주자 요청 — 인조대리석 → 천연대리석",
    items: [
      { id: "i1", name: "천연대리석 상판", qty: 3.2, unit: "㎡", unitPrice: 280000 },
      { id: "i2", name: "철거·재시공 노무", qty: 1, unit: "식", unitPrice: 450000 },
    ],
    daysExtend: 3,
    status: "보냄",
    token: "demo_cafe_co1",
    createdAt: "2026-07-20T10:00:00+09:00",
    sentAt: "2026-07-20T10:05:00+09:00",
    photoNote: "현장 카톡 사진 첨부(데모)",
  },
  {
    id: "co2",
    projectId: "p1",
    number: 2,
    title: "조명 추가 6개소",
    reason: "조명 위치 추가 지시",
    items: [
      { id: "i3", name: "펜던트 조명 설치", qty: 6, unit: "개", unitPrice: 95000 },
      { id: "i4", name: "배선 보강", qty: 1, unit: "식", unitPrice: 220000 },
    ],
    daysExtend: 1,
    status: "승인",
    token: "demo_cafe_co2",
    createdAt: "2026-07-10T11:00:00+09:00",
    sentAt: "2026-07-10T11:10:00+09:00",
    decidedAt: "2026-07-10T15:00:00+09:00",
  },
  {
    id: "co3",
    projectId: "p3",
    number: 1,
    title: "욕실 타일 업그레이드",
    reason: "자재 등급 상향",
    items: [{ id: "i5", name: "수입타일 차액", qty: 18, unit: "㎡", unitPrice: 42000 }],
    daysExtend: 2,
    status: "작성중",
    token: "demo_hannam_co1",
    createdAt: "2026-07-25T09:00:00+09:00",
  },
  {
    id: "co4",
    projectId: "p2",
    number: 1,
    title: "유리 파티션 두께 변경",
    reason: "소음 이슈로 12mm → 16mm",
    items: [{ id: "i6", name: "강화유리 차액", qty: 14, unit: "㎡", unitPrice: 38000 }],
    daysExtend: 4,
    status: "거절",
    token: "demo_pangyo_co1",
    createdAt: "2026-07-08T09:00:00+09:00",
    sentAt: "2026-07-08T09:30:00+09:00",
    decidedAt: "2026-07-09T10:00:00+09:00",
    clientNote: "예산 초과로 보류",
  },
];

export function createDemo(plan: AppState["profile"]["plan"] = "standard"): AppState {
  return {
    profile: {
      companyName: "한빛인테리어",
      ownerName: "정우진",
      email: "demo@chugahwak.kr",
      phone: "02-555-0199",
      plan,
    },
    projects: DEMO_PROJECTS.map((p) => ({ ...p })),
    orders: DEMO_ORDERS.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) })),
    activity: [
      {
        id: "a0",
        at: new Date().toISOString(),
        message: `${getPlan(plan).name} 데모 — 미승인 추가공사부터 합의 링크를 보내세요.`,
      },
    ],
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createDemo();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = createDemo();
      localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    return { ...createDemo(), ...JSON.parse(raw) } as AppState;
  } catch {
    return createDemo();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState(plan?: AppState["profile"]["plan"]) {
  const fresh = createDemo(plan || "standard");
  saveState(fresh);
  return fresh;
}

export function withActivity(state: AppState, message: string): AppState {
  return {
    ...state,
    activity: [
      { id: `a_${Date.now()}`, at: new Date().toISOString(), message },
      ...state.activity,
    ].slice(0, 40),
  };
}

export function approveUrl(token: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://chugahwak.kr");
  return `${base}/c/${token}`;
}

export function summarize(state: AppState) {
  const pending = state.orders.filter((o) => o.status === "보냄" || o.status === "작성중");
  const approved = state.orders.filter((o) => o.status === "승인" || o.status === "청구반영");
  const approvedWon = approved.reduce((s, o) => s + orderTotal(o), 0);
  const pendingWon = state.orders
    .filter((o) => o.status === "보냄")
    .reduce((s, o) => s + orderTotal(o), 0);
  return {
    projects: state.projects.length,
    pending: pending.length,
    approved: approved.length,
    approvedWon,
    pendingWon,
  };
}

export function projectOf(state: AppState, id: string) {
  return state.projects.find((p) => p.id === id);
}

export function nextCoNumber(state: AppState, projectId: string) {
  const nums = state.orders.filter((o) => o.projectId === projectId).map((o) => o.number);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export function findByToken(token: string): { state: AppState; order: ChangeOrder; project: Project } | null {
  const state = loadState();
  const order = state.orders.find((o) => o.token === token);
  if (!order) {
    // seed demo tokens
    const demo = createDemo();
    const o = demo.orders.find((x) => x.token === token);
    if (!o) return null;
    const p = demo.projects.find((x) => x.id === o.projectId)!;
    return { state: demo, order: o, project: p };
  }
  const project = state.projects.find((p) => p.id === order.projectId);
  if (!project) return null;
  return { state, order, project };
}

export { newToken };
