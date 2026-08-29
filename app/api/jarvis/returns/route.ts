import { NextResponse } from "next/server";
import { getJarvisSessionFromRequest } from "@/jarvis/core/session-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { loadState, saveState } from "@/jarvis/core/store";
import { decideReturn, summarizeDecision, type ReturnRequest } from "@/jarvis/returns/decide";
import { RETURN_REASON_LABELS, type ReturnReason } from "@/jarvis/returns/rules";
import type { ReturnCase } from "@/jarvis/core/types";
import { sendReturnAlert } from "@/jarvis/engine/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 접수된 반품 목록 — 안 끝난 건이 위로 온다 */
export async function GET(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const state = await loadState();
  const all = state.returns ?? [];
  return NextResponse.json({
    returns: [...all].sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    }),
    openCount: all.filter((r) => r.status === "open").length,
  });
}

function isReturnReason(v: unknown): v is ReturnReason {
  return typeof v === "string" && v in RETURN_REASON_LABELS;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
}

/**
 * 반품 접수 · 마무리.
 *
 * ★ 접수는 "판정까지" 한다
 *
 * 접수만 해두고 판정을 나중에 하면, 사장님이 화면을 열어보기 전까지
 * 아무 일도 안 일어난다. 반품은 응답 기한이 있는 일이라 그대로 페널티가
 * 된다. 그래서 들어오는 즉시 판정하고, 자동 처리할 수 있는 건은 그
 * 사실까지 기록한다.
 */
export async function POST(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const state = await loadState();
  state.returns ??= [];

  // ── 사장님이 확인해 마무리 ────────────────────────────────
  if (body.action === "resolve") {
    const target = state.returns.find((r) => r.id === body.caseId);
    if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    target.status = "resolved";
    target.resolvedNote = typeof body.note === "string" ? body.note.slice(0, 500) : undefined;
    target.updatedAt = new Date().toISOString();
    await saveState(state);
    return NextResponse.json({ ok: true, case: target });
  }

  // ── 접수 ─────────────────────────────────────────────────
  if (!isReturnReason(body.reason)) {
    return NextResponse.json(
      { error: "BAD_REASON", reason: "반품 사유를 알 수 없습니다." },
      { status: 400 },
    );
  }
  if (typeof body.deliveredAt !== "string" || typeof body.requestedAt !== "string") {
    return NextResponse.json(
      { error: "BAD_DATES", reason: "배송 완료일과 신청일이 필요합니다." },
      { status: 400 },
    );
  }

  const draft =
    typeof body.draftId === "string"
      ? state.drafts.find((d) => d.id === body.draftId)
      : undefined;

  const req: ReturnRequest = {
    id: typeof body.id === "string" && body.id ? body.id : `r_${Date.now().toString(36)}`,
    reason: body.reason,
    deliveredAt: body.deliveredAt,
    requestedAt: body.requestedAt,
    // 금액을 안 주면 그 상품의 등록가를 쓴다 — 없는 값을 0으로 두면
    // "0원 환불"이라는 위험한 판정이 나온다
    paidKrw: num(body.paidKrw) || draft?.candidate.priceKrw || 0,
    outboundShippingKrw: num(body.outboundShippingKrw),
    returnShippingKrw: num(body.returnShippingKrw),
    limits: Array.isArray(body.limits) ? (body.limits as ReturnRequest["limits"]) : undefined,
    note: typeof body.note === "string" ? body.note.slice(0, 500) : undefined,
  };

  const decision = decideReturn({
    request: req,
    supplier: {
      policyText: draft?.candidate.supplier.returnPolicyText,
      returnAddress: undefined,
    },
  });

  const now = new Date().toISOString();
  const record: ReturnCase = {
    id: req.id,
    draftId: draft?.id,
    tossProductNo: draft?.tossProductNo,
    request: req,
    decision,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  state.returns.unshift(record);
  await saveState(state);

  // 결정을 기다리는 건만 문자로 알린다. 자비스가 알아서 처리한 반품까지
  // 문자를 보내면 스팸이 되고, 정작 급한 문자가 묻힌다.
  let alertSent = false;
  if (decision.action === "needs_owner" && state.settings.alertPhone) {
    const openCount = state.returns.filter(
      (r) => r.status === "open" && r.decision.action === "needs_owner",
    ).length;
    const alert = await sendReturnAlert(state.settings.alertPhone, openCount);
    alertSent = alert.sent;
  }

  return NextResponse.json({
    alertSent,
    ok: true,
    case: record,
    summary: summarizeDecision(decision),
  });
}
