import { getPlan } from "./plans";
import type { ActivityItem, AppState, ClientAccount, DocKind, SubmittedFile } from "./types";
import { isDoneStatus, newReplyToken, newSubmitToken } from "./types";
import { shouldEnterCallQueue } from "./chase";

const STORAGE_KEY = "suimcheck.v3";
const PUBLIC_SUBMISSIONS_KEY = "suimcheck.public.submissions.v1";
const PUBLIC_REPLIES_KEY = "suimcheck.public.replies.v1";

function monthLabel(d = new Date()) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

function withToken(
  c: Omit<ClientAccount, "submitToken" | "replyToken" | "files"> &
    Partial<Pick<ClientAccount, "submitToken" | "replyToken" | "files">>,
): ClientAccount {
  return {
    ...c,
    submitToken: c.submitToken || newSubmitToken(),
    replyToken: c.replyToken || newReplyToken(),
    files: c.files || [],
  };
}

export const DEMO_CLIENTS: ClientAccount[] = [
  withToken({
    id: "c1",
    name: "한빛카페 성수점",
    contactName: "김민지",
    phone: "010-2345-1100",
    docs: ["통장사본", "카드매출", "세금계산서"],
    deadlineDay: 5,
    status: "지연",
    lastSentAt: "2026-07-22T09:10:00+09:00",
    notes: "지난달에도 D+2 제출",
    submitToken: "demo_hanbit",
    replyToken: "demo_reply_hanbit",
    inCallQueue: true,
    assignee: "이서연",
  }),
  withToken({
    id: "c2",
    name: "동행건설",
    contactName: "박재훈",
    phone: "010-8890-2211",
    docs: ["통장사본", "세금계산서", "급여대장"],
    deadlineDay: 7,
    status: "2차발송",
    lastSentAt: "2026-07-24T14:02:00+09:00",
    submitToken: "demo_donghang",
    replyToken: "demo_reply_donghang",
    inCallQueue: true,
    assignee: "이서연",
  }),
  withToken({
    id: "c3",
    name: "미르한의원",
    contactName: "이수연",
    phone: "010-5512-7788",
    docs: ["통장사본", "카드매출", "현금영수증"],
    deadlineDay: 10,
    status: "1차발송",
    lastSentAt: "2026-07-25T11:30:00+09:00",
    submitToken: "demo_mir",
    replyToken: "demo_reply_mir",
    assignee: "이서연",
  }),
  withToken({
    id: "c4",
    name: "오픈로지스",
    contactName: "최도윤",
    phone: "010-6677-3344",
    docs: ["통장사본", "세금계산서", "기타증빙"],
    deadlineDay: 10,
    status: "제출완료",
    lastSentAt: "2026-07-20T10:00:00+09:00",
    submittedAt: "2026-07-23T16:40:00+09:00",
    submitToken: "demo_open",
    replyToken: "demo_reply_open",
    files: [
      {
        id: "f1",
        name: "7월_통장.pdf",
        size: 120000,
        uploadedAt: "2026-07-23T16:40:00+09:00",
        docKind: "통장사본",
      },
    ],
  }),
  withToken({
    id: "c5",
    name: "라온베이커리",
    contactName: "정하늘",
    phone: "010-1122-9988",
    docs: ["통장사본", "카드매출"],
    deadlineDay: 12,
    status: "대기",
    submitToken: "demo_raon",
    replyToken: "demo_reply_raon",
  }),
  withToken({
    id: "c6",
    name: "넥스트모빌리티",
    contactName: "윤서준",
    phone: "010-4455-6677",
    docs: ["통장사본", "세금계산서", "급여대장", "기타증빙"],
    deadlineDay: 15,
    status: "대기",
    submitToken: "demo_next",
    replyToken: "demo_reply_next",
  }),
  withToken({
    id: "c7",
    name: "청담피부클리닉",
    contactName: "한지우",
    phone: "010-7788-0099",
    docs: ["통장사본", "카드매출", "세금계산서"],
    deadlineDay: 8,
    status: "제출완료",
    submittedAt: "2026-07-21T09:15:00+09:00",
    lastSentAt: "2026-07-18T09:00:00+09:00",
    submitToken: "demo_cheong",
    replyToken: "demo_reply_cheong",
  }),
  withToken({
    id: "c8",
    name: "스페이스핏 필라테스",
    contactName: "오세린",
    phone: "010-3322-5566",
    docs: ["통장사본", "카드매출", "현금영수증"],
    deadlineDay: 9,
    status: "1차발송",
    lastSentAt: "2026-07-25T08:45:00+09:00",
    submitToken: "demo_space",
    replyToken: "demo_reply_space",
  }),
];

function pushActivity(list: ActivityItem[], message: string): ActivityItem[] {
  return [
    { id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), message },
    ...list,
  ].slice(0, 50);
}

export function createDemoState(plan: AppState["profile"]["plan"] = "standard"): AppState {
  return {
    profile: {
      officeName: "바른세무회계사무소",
      ownerName: "이서연",
      email: "demo@suimcheck.kr",
      phone: "02-1234-5678",
      plan,
      liveSend: false,
    },
    clients: DEMO_CLIENTS.map((c) => ({ ...c, files: [...(c.files || [])] })),
    monthLabel: monthLabel(),
    activity: [
      {
        id: "a0",
        at: new Date().toISOString(),
        message: `${getPlan(plan).name} · 알림톡→원탭 회신→전화 잔여 큐로 마감을 닫습니다.`,
      },
    ],
    schedule: { enabled: plan !== "lite", d7: true, d3: true, d1: true },
    messagesUsed: 12,
  };
}

function migrate(raw: unknown): AppState {
  const base = createDemoState("standard");
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<AppState>;
  const clients = Array.isArray(obj.clients)
    ? obj.clients.map((c) =>
        withToken({
          ...c,
          files: Array.isArray(c.files) ? c.files : [],
          inCallQueue: c.inCallQueue ?? shouldEnterCallQueue(c as ClientAccount),
        }),
      )
    : base.clients;
  return {
    ...base,
    ...obj,
    profile: {
      ...base.profile,
      ...(obj.profile || {}),
      plan: (obj.profile?.plan as AppState["profile"]["plan"]) || "standard",
      liveSend: obj.profile?.liveSend ?? false,
    },
    clients,
    monthLabel: obj.monthLabel || base.monthLabel,
    activity: Array.isArray(obj.activity) ? obj.activity : base.activity,
    schedule: { ...base.schedule, ...(obj.schedule || {}) },
    messagesUsed: typeof obj.messagesUsed === "number" ? obj.messagesUsed : base.messagesUsed,
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createDemoState();
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem("suimcheck.v2") ||
      window.localStorage.getItem("suimcheck.v1");
    if (!raw) {
      const fresh = createDemoState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      syncPublicDirectory(fresh);
      return fresh;
    }
    let parsed = migrate(JSON.parse(raw));
    parsed = mergePublicFiles(parsed);
    parsed = mergePublicReplies(parsed);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    syncPublicDirectory(parsed);
    return parsed;
  } catch {
    return createDemoState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  syncPublicDirectory(state);
}

export function resetDemoState(plan?: AppState["profile"]["plan"]): AppState {
  const fresh = createDemoState(plan || "standard");
  saveState(fresh);
  return fresh;
}

export function withActivity(state: AppState, message: string): AppState {
  return { ...state, activity: pushActivity(state.activity || [], message) };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseClientsCsv(
  text: string,
): Omit<ClientAccount, "id" | "status" | "submitToken" | "replyToken" | "files">[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((row) => {
    const cols = splitCsvLine(row).map((c) => c.replace(/^"|"$/g, ""));
    const [name, contactName, phone, docsRaw, deadlineRaw, assignee] = cols;
    const docs = (docsRaw || "통장사본")
      .split("|")
      .map((d) => d.trim())
      .filter(Boolean) as DocKind[];
    return {
      name: name || "이름없음",
      contactName: contactName || "담당자",
      phone: phone || "",
      docs: docs.length ? docs : ["통장사본"],
      deadlineDay: Math.min(28, Math.max(1, Number(deadlineRaw) || 10)),
      assignee: assignee || undefined,
    };
  });
}

export function summarize(clients: ClientAccount[]) {
  const total = clients.length;
  const done = clients.filter((c) => isDoneStatus(c.status)).length;
  const delayed = clients.filter((c) => c.status === "지연").length;
  const inFlight = clients.filter(
    (c) => c.status === "1차발송" || c.status === "2차발송" || c.status === "대기",
  ).length;
  const withFiles = clients.filter((c) => (c.files?.length || 0) > 0).length;
  const callQueue = clients.filter((c) => shouldEnterCallQueue(c)).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, delayed, inFlight, withFiles, callQueue, rate };
}

export function nextChaseStatus(status: ClientAccount["status"]): ClientAccount["status"] {
  if (status === "대기" || status === "제출완료" || status === "해당없음") return "1차발송";
  if (status === "1차발송") return "2차발송";
  return "지연";
}

export function submitUrlFor(token: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://suimcheck.kr");
  return `${base}/s/${token}`;
}

export function replyUrlFor(token: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://suimcheck.kr");
  return `${base}/r/${token}`;
}

export type PublicClientCard = {
  token: string;
  replyToken: string;
  officeName: string;
  clientName: string;
  contactName: string;
  docs: DocKind[];
  monthLabel: string;
  files: SubmittedFile[];
  clientReply?: "이미냈어요" | "해당없음" | null;
};

function mergePublicFiles(state: AppState): AppState {
  try {
    const raw = window.localStorage.getItem(PUBLIC_SUBMISSIONS_KEY);
    if (!raw) return state;
    const cards = JSON.parse(raw) as PublicClientCard[];
    let changed = false;
    const clients = state.clients.map((c) => {
      const card = cards.find((x) => x.token === c.submitToken);
      if (!card?.files?.length) return c;
      const known = new Set((c.files || []).map((f) => f.id));
      const incoming = card.files.filter((f) => !known.has(f.id));
      if (!incoming.length) {
        if ((c.files?.length || 0) === 0 && card.files.length > 0) {
          changed = true;
          return {
            ...c,
            files: card.files,
            status: "제출완료" as const,
            submittedAt: c.submittedAt || card.files[card.files.length - 1]?.uploadedAt,
            inCallQueue: false,
          };
        }
        return c;
      }
      changed = true;
      return {
        ...c,
        files: [...(c.files || []), ...incoming],
        status: "제출완료" as const,
        submittedAt: new Date().toISOString(),
        inCallQueue: false,
      };
    });
    return changed ? { ...state, clients } : state;
  } catch {
    return state;
  }
}

function mergePublicReplies(state: AppState): AppState {
  try {
    const raw = window.localStorage.getItem(PUBLIC_REPLIES_KEY);
    if (!raw) return state;
    const replies = JSON.parse(raw) as {
      replyToken: string;
      reply: "이미냈어요" | "해당없음";
      at: string;
    }[];
    let changed = false;
    const clients = state.clients.map((c) => {
      const hit = replies.find((r) => r.replyToken === c.replyToken);
      if (!hit) return c;
      if (c.clientReply === hit.reply && isDoneStatus(c.status)) return c;
      changed = true;
      return {
        ...c,
        clientReply: hit.reply,
        clientRepliedAt: hit.at,
        status: hit.reply === "해당없음" ? ("해당없음" as const) : ("제출완료" as const),
        submittedAt: hit.reply === "이미냈어요" ? hit.at : c.submittedAt,
        inCallQueue: false,
      };
    });
    return changed ? { ...state, clients } : state;
  } catch {
    return state;
  }
}

export function runAutoChasePass(state: AppState): AppState {
  if (!state.schedule.enabled) return state;
  const today = new Date().getDate();
  const targets = state.clients.filter((c) => {
    if (isDoneStatus(c.status) || !c.phone) return false;
    const d = c.deadlineDay;
    return (
      (state.schedule.d7 && today === Math.max(1, d - 7)) ||
      (state.schedule.d3 && today === Math.max(1, d - 3)) ||
      (state.schedule.d1 && today === Math.max(1, d - 1)) ||
      c.status === "지연" ||
      c.status === "대기"
    );
  });
  if (!targets.length) return withActivity(state, "자동 독촉: 대상 없음");
  let next: AppState = {
    ...state,
    messagesUsed: state.messagesUsed + targets.length,
    clients: state.clients.map((c) => {
      if (!targets.some((t) => t.id === c.id)) return c;
      const status = nextChaseStatus(c.status);
      return {
        ...c,
        status,
        lastSentAt: new Date().toISOString(),
        inCallQueue: status === "지연" || status === "2차발송",
      };
    }),
  };
  next = withActivity(next, `자동 독촉 ${targets.length}곳 발송`);
  return next;
}

export function exportClientsCsv(state: AppState): string {
  const header = "상호,담당자,연락처,상태,마감일,파일수,전화큐,담당,필요자료";
  const rows = state.clients.map((c) =>
    [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.contactName.replace(/"/g, '""')}"`,
      c.phone,
      c.status,
      c.deadlineDay,
      c.files?.length || 0,
      shouldEnterCallQueue(c) ? "Y" : "",
      c.assignee || "",
      `"${c.docs.join("|")}"`,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export function syncPublicDirectory(state: AppState) {
  if (typeof window === "undefined") return;
  const cards: PublicClientCard[] = state.clients.map((c) => ({
    token: c.submitToken,
    replyToken: c.replyToken,
    officeName: state.profile.officeName,
    clientName: c.name,
    contactName: c.contactName,
    docs: c.docs,
    monthLabel: state.monthLabel,
    files: c.files || [],
    clientReply: c.clientReply || null,
  }));
  window.localStorage.setItem(PUBLIC_SUBMISSIONS_KEY, JSON.stringify(cards));
}

export function loadPublicCard(token: string): PublicClientCard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLIC_SUBMISSIONS_KEY);
    if (!raw) {
      const demo = createDemoState();
      syncPublicDirectory(demo);
      return loadPublicCard(token);
    }
    const list = JSON.parse(raw) as PublicClientCard[];
    return list.find((c) => c.token === token) || null;
  } catch {
    return null;
  }
}

export function loadPublicCardByReply(replyToken: string): PublicClientCard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PUBLIC_SUBMISSIONS_KEY);
    if (!raw) {
      const demo = createDemoState();
      syncPublicDirectory(demo);
      return loadPublicCardByReply(replyToken);
    }
    const list = JSON.parse(raw) as PublicClientCard[];
    return list.find((c) => c.replyToken === replyToken) || null;
  } catch {
    return null;
  }
}

export function savePublicUpload(token: string, file: SubmittedFile) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(PUBLIC_SUBMISSIONS_KEY);
  const list: PublicClientCard[] = raw ? JSON.parse(raw) : [];
  const idx = list.findIndex((c) => c.token === token);
  if (idx < 0) return;
  list[idx] = { ...list[idx], files: [...(list[idx].files || []), file] };
  window.localStorage.setItem(PUBLIC_SUBMISSIONS_KEY, JSON.stringify(list));

  try {
    const officeRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!officeRaw) return;
    const state = migrate(JSON.parse(officeRaw));
    state.clients = state.clients.map((c) => {
      if (c.submitToken !== token) return c;
      return {
        ...c,
        files: [...(c.files || []), file],
        status: "제출완료",
        submittedAt: new Date().toISOString(),
        inCallQueue: false,
      };
    });
    state.activity = pushActivity(state.activity, `${list[idx].clientName}에서 자료를 제출했습니다`);
    saveState(state);
  } catch {
    /* ignore */
  }
}

export function savePublicReply(replyToken: string, reply: "이미냈어요" | "해당없음") {
  if (typeof window === "undefined") return;
  const at = new Date().toISOString();
  const raw = window.localStorage.getItem(PUBLIC_REPLIES_KEY);
  const list: { replyToken: string; reply: "이미냈어요" | "해당없음"; at: string }[] = raw
    ? JSON.parse(raw)
    : [];
  const idx = list.findIndex((r) => r.replyToken === replyToken);
  const row = { replyToken, reply, at };
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  window.localStorage.setItem(PUBLIC_REPLIES_KEY, JSON.stringify(list));

  const cardsRaw = window.localStorage.getItem(PUBLIC_SUBMISSIONS_KEY);
  if (cardsRaw) {
    const cards = JSON.parse(cardsRaw) as PublicClientCard[];
    const i = cards.findIndex((c) => c.replyToken === replyToken);
    if (i >= 0) {
      cards[i] = { ...cards[i], clientReply: reply };
      window.localStorage.setItem(PUBLIC_SUBMISSIONS_KEY, JSON.stringify(cards));
    }
  }

  try {
    const officeRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!officeRaw) return;
    const state = migrate(JSON.parse(officeRaw));
    const name = state.clients.find((c) => c.replyToken === replyToken)?.name || "거래처";
    state.clients = state.clients.map((c) => {
      if (c.replyToken !== replyToken) return c;
      return {
        ...c,
        clientReply: reply,
        clientRepliedAt: at,
        status: reply === "해당없음" ? "해당없음" : "제출완료",
        submittedAt: reply === "이미냈어요" ? at : c.submittedAt,
        inCallQueue: false,
      };
    });
    state.activity = pushActivity(state.activity, `${name} 원탭 회신: ${reply}`);
    saveState(state);
  } catch {
    /* ignore */
  }
}
