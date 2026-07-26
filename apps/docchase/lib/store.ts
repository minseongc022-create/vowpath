import type { AppState, ClientAccount } from "./types";

const STORAGE_KEY = "suimcheck.v1";

function monthLabel(d = new Date()) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export const DEMO_CLIENTS: ClientAccount[] = [
  {
    id: "c1",
    name: "한빛카페 성수점",
    contactName: "김민지",
    phone: "010-2345-1100",
    docs: ["통장사본", "카드매출", "세금계산서"],
    deadlineDay: 5,
    status: "지연",
    lastSentAt: "2026-07-22T09:10:00+09:00",
    notes: "지난달에도 D+2 제출",
  },
  {
    id: "c2",
    name: "동행건설",
    contactName: "박재훈",
    phone: "010-8890-2211",
    docs: ["통장사본", "세금계산서", "급여대장"],
    deadlineDay: 7,
    status: "2차발송",
    lastSentAt: "2026-07-24T14:02:00+09:00",
  },
  {
    id: "c3",
    name: "미르한의원",
    contactName: "이수연",
    phone: "010-5512-7788",
    docs: ["통장사본", "카드매출", "현금영수증"],
    deadlineDay: 10,
    status: "1차발송",
    lastSentAt: "2026-07-25T11:30:00+09:00",
  },
  {
    id: "c4",
    name: "오픈로지스",
    contactName: "최도윤",
    phone: "010-6677-3344",
    docs: ["통장사본", "세금계산서", "기타증빙"],
    deadlineDay: 10,
    status: "제출완료",
    lastSentAt: "2026-07-20T10:00:00+09:00",
    submittedAt: "2026-07-23T16:40:00+09:00",
  },
  {
    id: "c5",
    name: "라온베이커리",
    contactName: "정하늘",
    phone: "010-1122-9988",
    docs: ["통장사본", "카드매출"],
    deadlineDay: 12,
    status: "대기",
  },
  {
    id: "c6",
    name: "넥스트모빌리티",
    contactName: "윤서준",
    phone: "010-4455-6677",
    docs: ["통장사본", "세금계산서", "급여대장", "기타증빙"],
    deadlineDay: 15,
    status: "대기",
  },
  {
    id: "c7",
    name: "청담피부클리닉",
    contactName: "한지우",
    phone: "010-7788-0099",
    docs: ["통장사본", "카드매출", "세금계산서"],
    deadlineDay: 8,
    status: "제출완료",
    submittedAt: "2026-07-21T09:15:00+09:00",
    lastSentAt: "2026-07-18T09:00:00+09:00",
  },
  {
    id: "c8",
    name: "스페이스핏 필라테스",
    contactName: "오세린",
    phone: "010-3322-5566",
    docs: ["통장사본", "카드매출", "현금영수증"],
    deadlineDay: 9,
    status: "1차발송",
    lastSentAt: "2026-07-25T08:45:00+09:00",
  },
];

export function createDemoState(): AppState {
  return {
    profile: {
      officeName: "바른세무회계사무소",
      ownerName: "이서연",
      email: "demo@suimcheck.kr",
      phone: "02-1234-5678",
      plan: "standard",
    },
    clients: DEMO_CLIENTS,
    monthLabel: monthLabel(),
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createDemoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = createDemoState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(raw) as AppState;
  } catch {
    return createDemoState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetDemoState(): AppState {
  const fresh = createDemoState();
  saveState(fresh);
  return fresh;
}

export function parseClientsCsv(text: string): Omit<ClientAccount, "id" | "status">[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const rows = lines.slice(1);
  return rows.map((row) => {
    const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [name, contactName, phone, docsRaw, deadlineRaw] = cols;
    const docs = (docsRaw || "통장사본")
      .split("|")
      .map((d) => d.trim())
      .filter(Boolean) as ClientAccount["docs"];
    return {
      name: name || "이름없음",
      contactName: contactName || "담당자",
      phone: phone || "",
      docs: docs.length ? docs : ["통장사본"],
      deadlineDay: Math.min(28, Math.max(1, Number(deadlineRaw) || 10)),
    };
  });
}

export function summarize(clients: ClientAccount[]) {
  const total = clients.length;
  const done = clients.filter((c) => c.status === "제출완료").length;
  const delayed = clients.filter((c) => c.status === "지연").length;
  const inFlight = clients.filter((c) =>
    c.status === "1차발송" || c.status === "2차발송" || c.status === "대기",
  ).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, delayed, inFlight, rate };
}
