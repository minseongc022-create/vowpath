import { NextResponse } from "next/server";
import { z } from "zod";
import { approveReservationJob, canAccessBatch, retryFailedReservationJob } from "@/dajeong/lib/reservation-queue";
import { reservationStateStore } from "@/dajeong/lib/reservation-store";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), jobId: z.string().min(5).max(100), approvalText: z.string().trim().min(4).max(500) }),
  z.object({ action: z.literal("retry"), jobId: z.string().min(5).max(100) }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "승인할 조건을 다시 확인해 주세요." }, { status: 400 });
  const state = await reservationStateStore.read();
  const batch = state.batches[id];
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!batch || !canAccessBatch(batch, token)) return NextResponse.json({ error: "이 예약 작업을 변경할 권한이 없어요." }, { status: 403 });
  try {
    const updated = parsed.data.action === "approve"
      ? await approveReservationJob(reservationStateStore, id, parsed.data.jobId, parsed.data.approvalText)
      : await retryFailedReservationJob(reservationStateStore, id, parsed.data.jobId);
    const { accessTokenHash: _, ...safe } = updated;
    return NextResponse.json({ batch: safe, message: updated.message });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: code === "EXACT_AMOUNT_APPROVAL_REQUIRED" ? "정확한 금액을 포함해 명시적으로 승인해 주세요." : code === "EXPLICIT_APPROVAL_REQUIRED" ? "승인 또는 동의 의사를 명확히 적어 주세요." : code === "RESERVATION_RETRY_NOT_SAFE" ? "중복 예약 위험이 있거나 같은 조건으로 재시도할 수 없는 결과예요. 계획에서 대안을 선택해 주세요." : "현재 승인하거나 다시 시도할 조건이 없어요." }, { status: 409 });
  }
}
