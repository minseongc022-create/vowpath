import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBookingCallSignature } from "@/dajeong/lib/booking-call";
import { getBookingCall, getBookingCallByProviderId, updateBookingCall } from "@/dajeong/lib/booking-call-store";

/**
 * 통화 중인 음성 에이전트가 "이렇게 정리됐습니다"라고 결과를 넘기는 곳.
 *
 * 여기가 예약 확정이 만들어지는 유일한 통로라서, 서명 검증이 통과한 요청만 받는다. 그리고
 * 에이전트가 넘긴 값을 그대로 믿되 — 확정(confirmed)인데 무슨 근거로 확정인지(가게가 뭐라고
 * 했는지) 한 줄도 없으면 확정으로 받지 않는다. "확인은 못 했지만 아마 될 것 같다"를 예약
 * 완료로 적는 순간 사용자는 그 가게 앞에서 낭패를 본다.
 */

const argsSchema = z.object({
  outcome: z.enum(["confirmed", "declined", "alternative_offered", "unreachable", "needs_human"]),
  /** 가게가 실제로 한 말. 확정일 때는 이게 있어야 확정으로 인정한다. */
  confirmedDetail: z.string().trim().max(300).optional(),
  offeredAlternative: z.string().trim().max(120).optional(),
  quotedAmount: z.number().int().min(0).max(100_000_000).optional(),
  cancellationTerms: z.string().trim().max(300).optional(),
  summary: z.string().trim().max(600).optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validateBookingCallSignature(request, rawBody)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ result: "결과를 이해하지 못했습니다." }, { status: 400 });
  }

  const call = (body.call ?? {}) as Record<string, unknown>;
  const metadata = (call.metadata ?? {}) as Record<string, unknown>;
  const recordId = typeof metadata.callRecordId === "string" ? metadata.callRecordId : "";
  const providerCallId = String(call.call_id ?? body.call_id ?? "");

  const record = recordId
    ? await getBookingCall(recordId)
    : providerCallId
      ? await getBookingCallByProviderId(providerCallId)
      : null;
  if (!record) return NextResponse.json({ result: "연결된 예약 건을 찾지 못했습니다." }, { status: 404 });

  const parsed = argsSchema.safeParse(body.args ?? body.arguments ?? body.parameters ?? {});
  if (!parsed.success) return NextResponse.json({ result: "결과 형식이 올바르지 않습니다." }, { status: 400 });

  const args = parsed.data;
  // 근거 없는 확정은 확정으로 받지 않는다 — 사람이 다시 확인해야 할 건으로 내린다.
  const grounded = args.outcome !== "confirmed" || Boolean(args.confirmedDetail?.trim());
  const outcome = grounded ? args.outcome : "needs_human";
  const summary = grounded ? args.summary : args.summary ?? "통화에서 확정 근거를 확인하지 못했습니다.";

  const updated = await updateBookingCall(record.id, {
    status: "finished",
    outcome,
    confirmedDetail: args.confirmedDetail,
    offeredAlternative: args.offeredAlternative,
    quotedAmount: args.quotedAmount,
    cancellationTerms: args.cancellationTerms,
    summary,
    endedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    result: updated ? "결과를 기록했습니다. 감사합니다." : "기록에 실패했습니다.",
  });
}
