import type { AlimtalkSendInput, AlimtalkSendResult } from "./alimtalk";

export type SendClientPayload = {
  messages: AlimtalkSendInput[];
  preferLive?: boolean;
};

export async function fetchAlimtalkStatus() {
  try {
    const res = await fetch("/api/alimtalk/status", { cache: "no-store" });
    if (!res.ok) return { configured: false, fromMasked: null, smsFailover: false, templateReady: false };
    return (await res.json()) as {
      configured: boolean;
      fromMasked: string | null;
      smsFailover: boolean;
      templateReady: boolean;
    };
  } catch {
    return { configured: false, fromMasked: null, smsFailover: false, templateReady: false };
  }
}

export async function requestAlimtalkSend(payload: SendClientPayload): Promise<{
  ok: boolean;
  results: AlimtalkSendResult[];
  liveCount: number;
  practiceCount: number;
  failCount: number;
  error?: string;
}> {
  try {
    const res = await fetch("/api/alimtalk/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        results: [],
        liveCount: 0,
        practiceCount: 0,
        failCount: payload.messages.length,
        error: data?.error || "발송 요청 실패",
      };
    }
    return data;
  } catch (e) {
    return {
      ok: false,
      results: [],
      liveCount: 0,
      practiceCount: 0,
      failCount: payload.messages.length,
      error: e instanceof Error ? e.message : "네트워크 오류",
    };
  }
}
