import { NextResponse } from "next/server";
import { getJarvisSessionFromRequest } from "@/jarvis/core/session-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { loadState, saveState, findDraft, discardPendingDrafts } from "@/jarvis/core/store";
import { checkPrice, checkProfit } from "@/jarvis/core/rules";
import { revalidateCandidate } from "@/jarvis/engine/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 검수 대기 목록 */
export async function GET(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const state = await loadState();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const draft = findDraft(state, id);
    if (!draft) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ draft });
  }

  return NextResponse.json({
    drafts: state.drafts.filter((d) => d.status === "pending_review"),
    published: state.drafts.filter((d) => d.status === "published").length,
  });
}

/** 승인 · 반려 · 전부 비우기 */
export async function POST(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { action?: string; draftId?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const state = await loadState();

  if (body.action === "discard_all") {
    const removed = discardPendingDrafts(state);
    await saveState(state);
    return NextResponse.json({ ok: true, removed });
  }

  const draft = body.draftId ? findDraft(state, body.draftId) : undefined;
  if (!draft) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (body.action === "reject") {
    draft.status = "rejected";
    draft.rejectReason = body.reason?.slice(0, 500);
    draft.decidedBy = session.email;
    draft.updatedAt = new Date().toISOString();
    await saveState(state);
    return NextResponse.json({ ok: true, draft });
  }

  if (body.action === "approve") {
    // ★ 승인 순간에 게이트를 **한 번 더** 통과시킨다.
    //
    // 초안은 만들어진 뒤 시간이 지나 있을 수 있고, 그 사이 기준이 바뀌었을
    // 수도 있다. 옛 엔진이 만든 초안이 화면에 남아 있다가 승인되면서
    // 2,700만원짜리가 등록되는 일이 실제로 있었다 — 게이트는 만들 때가
    // 아니라 **나갈 때** 한 번 더 봐야 한다.
    // ★ 먼저 **지금** 공급처가 그대로인지 본다.
    //
    // 아래 게이트들은 초안에 적힌 숫자를 다시 재는 것뿐이라, 그 숫자가
    // 몇 시간 전 값이면 아무리 통과해도 의미가 없다. 아침에 만든 초안을
    // 저녁에 승인하는 사이 공급처는 값을 올리거나 상품을 내릴 수 있고,
    // 그러면 사장님이 승인한 상품과 실제로 팔리는 상품이 달라진다.
    const revalidation = await revalidateCandidate(draft.candidate);
    if (!revalidation.ok) {
      draft.status = "failed";
      draft.publishError = revalidation.reason;
      draft.updatedAt = new Date().toISOString();
      await saveState(state);
      return NextResponse.json(
        { error: "SUPPLIER_CHANGED", reason: revalidation.reason },
        { status: 422 },
      );
    }

    if (revalidation.changed) {
      // 값이 바뀌었으면 초안을 지금 값으로 갱신한다 — 옛 숫자로 등록하면
      // 검수 화면에서 본 것과 실제 상품이 다르다
      draft.candidate = revalidation.candidate;
      draft.listingPayload.salePrice = revalidation.candidate.priceKrw;
      draft.updatedAt = new Date().toISOString();
    }
    draft.revalidationNote = revalidation.note;

    const c = draft.candidate;
    const priceGate = checkPrice(c.priceKrw, c.supplier.landedCostKrw);
    if (!priceGate.ok) {
      draft.status = "failed";
      draft.publishError = priceGate.reason;
      draft.updatedAt = new Date().toISOString();
      await saveState(state);
      return NextResponse.json(
        { error: "GATE_FAILED", reason: priceGate.reason },
        { status: 422 },
      );
    }
    const profitGate = checkProfit({
      priceKrw: c.priceKrw,
      landedCostKrw: c.supplier.landedCostKrw,
    });
    if (!profitGate.ok) {
      draft.status = "failed";
      draft.publishError = profitGate.reason;
      draft.updatedAt = new Date().toISOString();
      await saveState(state);
      return NextResponse.json(
        { error: "GATE_FAILED", reason: profitGate.reason },
        { status: 422 },
      );
    }

    draft.status = "approved";
    draft.decidedBy = session.email;
    draft.updatedAt = new Date().toISOString();
    await saveState(state);
    return NextResponse.json({
      ok: true,
      draft,
      // 값이 바뀌어 다시 정했다면 화면에서 그대로 알려준다 — 조용히
      // 바꾸면 사장님이 승인한 가격과 다른 가격이 올라간 셈이 된다
      supplierChanged: revalidation.changed,
      supplierNote: revalidation.note,
    });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
