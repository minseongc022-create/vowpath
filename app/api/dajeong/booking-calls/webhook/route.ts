import { NextResponse } from "next/server";
import { validateBookingCallSignature } from "@/dajeong/lib/booking-call";
import { getBookingCall, getBookingCallByProviderId, updateBookingCall } from "@/dajeong/lib/booking-call-store";

/**
 * 통화 자체의 시작·종료를 알려주는 웹훅.
 *
 * 결과 내용은 에이전트가 report-outcome으로 따로 넘기는데, 안 받거나 바로 끊긴 통화는 그럴
 * 기회가 없다. 그래서 통화가 끝났는데 결과가 안 들어와 있으면 여기서 "연결 안 됨"으로 닫는다 —
 * 안 그러면 통화 중 상태로 영원히 남아서 사용자가 계속 기다리게 된다.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateBookingCallSignature(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = String(body.event ?? "");
  const call = (body.call ?? {}) as Record<string, unknown>;
  const metadata = (call.metadata ?? {}) as Record<string, unknown>;
  const recordId = typeof metadata.callRecordId === "string" ? metadata.callRecordId : "";
  const providerCallId = String(call.call_id ?? "");

  const record = recordId
    ? await getBookingCall(recordId)
    : providerCallId
      ? await getBookingCallByProviderId(providerCallId)
      : null;
  if (!record) return NextResponse.json({ ok: true });

  if (event === "call_started") {
    if (record.status === "queued") await updateBookingCall(record.id, { status: "in_progress" });
    return NextResponse.json({ ok: true });
  }

  if (event === "call_ended" || event === "call_analyzed") {
    // 에이전트가 이미 결과를 넘겼으면 그게 훨씬 정확하다 — 덮어쓰지 않는다.
    if (record.status === "finished" && record.outcome) return NextResponse.json({ ok: true });
    const transcript = typeof call.transcript === "string" ? call.transcript.trim() : "";
    const analysis = (call.call_analysis ?? {}) as Record<string, unknown>;
    const summary = typeof analysis.call_summary === "string" ? analysis.call_summary : undefined;
    await updateBookingCall(record.id, {
      status: "finished",
      // 통화는 됐는데 결과 보고가 없으면 사람이 확인해야 한다. 대화가 아예 없었으면 연결 실패다.
      outcome: transcript ? "needs_human" : "unreachable",
      summary: summary ?? (transcript ? "통화는 됐지만 결과가 정리되지 않았어." : undefined),
      endedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
