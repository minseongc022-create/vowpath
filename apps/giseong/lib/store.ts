import { getPlan } from "./plans";
import type { AppState, PayApp, Project } from "./types";
import { claimAmount, newToken } from "./types";

const KEY = "giseong.v1";

export const DEMO_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "송파 오피스 전기공사",
    approverName: "한빛건설 김과장",
    phone: "010-2345-1100",
    address: "서울 송파구 문정동",
    contractWon: 420000000,
    createdAt: "2026-03-01T09:00:00+09:00",
  },
  {
    id: "p2",
    name: "판교 설비 배관",
    approverName: "미래종합 박차장",
    phone: "010-8890-2211",
    address: "경기 성남시 분당구",
    contractWon: 185000000,
    createdAt: "2026-04-12T09:00:00+09:00",
  },
  {
    id: "p3",
    name: "인천 물류센터 방수",
    approverName: "건축주 이대표",
    phone: "010-5512-7788",
    address: "인천 서구",
    contractWon: 96000000,
    createdAt: "2026-05-01T09:00:00+09:00",
  },
];

export const DEMO_APPS: PayApp[] = [
  {
    id: "a1",
    projectId: "p1",
    number: 4,
    period: "2026-07",
    title: "7월 기성 (4차)",
    note: "간선·분전반 설치 완료분. 현장검수 사진 카톡 보관.",
    items: [
      { id: "i1", name: "간선 포설", qty: 1, unit: "식", unitPrice: 28000000, pctComplete: 100 },
      { id: "i2", name: "분전반 설치", qty: 4, unit: "면", unitPrice: 3200000, pctComplete: 100 },
    ],
    thisPeriodWon: 40800000,
    previousBilledWon: 126000000,
    retainageWon: 2040000,
    status: "보냄",
    token: "demo_songpa_g4",
    createdAt: "2026-07-22T10:00:00+09:00",
    sentAt: "2026-07-22T10:05:00+09:00",
    photoNote: "검수 사진 12장",
  },
  {
    id: "a2",
    projectId: "p1",
    number: 3,
    period: "2026-06",
    title: "6월 기성 (3차)",
    note: "배관·트레이 구간",
    items: [{ id: "i3", name: "케이블트레이", qty: 1, unit: "식", unitPrice: 35000000 }],
    thisPeriodWon: 35000000,
    previousBilledWon: 91000000,
    retainageWon: 1750000,
    status: "승인",
    token: "demo_songpa_g3",
    createdAt: "2026-06-20T11:00:00+09:00",
    sentAt: "2026-06-20T11:10:00+09:00",
    decidedAt: "2026-06-21T15:00:00+09:00",
  },
  {
    id: "a3",
    projectId: "p3",
    number: 2,
    period: "2026-07",
    title: "7월 방수 기성",
    note: "옥상 도막 2차",
    items: [{ id: "i4", name: "도막방수", qty: 420, unit: "㎡", unitPrice: 28000 }],
    thisPeriodWon: 11760000,
    previousBilledWon: 22000000,
    retainageWon: 588000,
    status: "작성중",
    token: "demo_incheon_g2",
    createdAt: "2026-07-25T09:00:00+09:00",
  },
  {
    id: "a4",
    projectId: "p2",
    number: 2,
    period: "2026-07",
    title: "7월 배관 기성",
    note: "기계실 1차",
    items: [{ id: "i5", name: "기계실 배관", qty: 1, unit: "식", unitPrice: 22000000 }],
    thisPeriodWon: 22000000,
    previousBilledWon: 45000000,
    retainageWon: 1100000,
    status: "수정요청",
    token: "demo_pangyo_g2",
    createdAt: "2026-07-15T09:00:00+09:00",
    sentAt: "2026-07-15T09:30:00+09:00",
    decidedAt: "2026-07-16T10:00:00+09:00",
    approverNote: "기계실 수량 재확인 요청",
  },
];

export function createDemo(plan: AppState["profile"]["plan"] = "standard"): AppState {
  return {
    profile: {
      companyName: "동방전기",
      ownerName: "최민재",
      email: "demo@giseong.kr",
      phone: "02-555-0288",
      plan,
    },
    projects: DEMO_PROJECTS.map((p) => ({ ...p })),
    apps: DEMO_APPS.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) })),
    activity: [
      {
        id: "a0",
        at: new Date().toISOString(),
        message: `${getPlan(plan).name} 데모 — 미승인 기성부터 승인 링크를 보내세요.`,
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
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://giseong.kr");
  return `${base}/p/${token}`;
}

export function summarize(state: AppState) {
  const pending = state.apps.filter((o) => o.status === "보냄" || o.status === "작성중" || o.status === "수정요청");
  const approved = state.apps.filter((o) => o.status === "승인");
  const approvedWon = approved.reduce((s, o) => s + claimAmount(o), 0);
  const pendingWon = state.apps
    .filter((o) => o.status === "보냄" || o.status === "수정요청")
    .reduce((s, o) => s + claimAmount(o), 0);
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

export function nextAppNumber(state: AppState, projectId: string) {
  const nums = state.apps.filter((o) => o.projectId === projectId).map((o) => o.number);
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

export function findByToken(token: string): { state: AppState; app: PayApp; project: Project } | null {
  const state = loadState();
  const app = state.apps.find((o) => o.token === token);
  if (!app) {
    const demo = createDemo();
    const o = demo.apps.find((x) => x.token === token);
    if (!o) return null;
    const p = demo.projects.find((x) => x.id === o.projectId)!;
    return { state: demo, app: o, project: p };
  }
  const project = state.projects.find((p) => p.id === app.projectId);
  if (!project) return null;
  return { state, app, project };
}

export { newToken };
