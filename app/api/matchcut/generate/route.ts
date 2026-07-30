import { NextResponse } from "next/server";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance, grantCredits } from "@/lib/matchcut/credits-store";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import { runGeneratePhase } from "@/lib/sourcing-detail/pipeline";
import type { MatchCandidate, MatchResult, ScrapedListing } from "@/lib/sourcing-detail/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const listing = body.listing as ScrapedListing;
    const match = body.match as MatchResult;
    const selectedCandidate = body.selectedCandidate as MatchCandidate;
    const referenceImageBase64 = String(body.referenceImageBase64 ?? "");
    const referenceMime = body.referenceMime ? String(body.referenceMime) : undefined;
    const maxAngles = Math.min(5, Math.max(1, Number(body.maxAngles ?? 3)));

    if (!listing || !match || !selectedCandidate) {
      return NextResponse.json({ error: "매칭 데이터가 필요합니다." }, { status: 400 });
    }
    if (!referenceImageBase64) {
      return NextResponse.json({ error: "실제 상품 사진이 필요합니다." }, { status: 400 });
    }

    const angleCost = CREDIT_COSTS.angle * maxAngles;
    await debitCredits(session.sub, angleCost);

    const result = await runGeneratePhase({
      listing,
      match,
      selectedCandidate,
      referenceImageBase64,
      referenceMime,
      maxAngles,
    });

    const failedCount = maxAngles - result.successCount;
    const refundAmount = failedCount * CREDIT_COSTS.angle;
    if (refundAmount > 0) {
      await grantCredits(session.sub, refundAmount, "permanent");
    }

    const credits = await getCreditBalance(session.sub);

    const projectId = body.projectId ? String(body.projectId) : null;
    if (projectId) {
      const { updateProject } = await import("@/lib/matchcut/projects-store");
      const existing = await import("@/lib/matchcut/projects-store").then((m) =>
        m.getProject(session.sub, projectId),
      );
      await updateProject(session.sub, projectId, {
        status: "generated",
        selectedCandidate,
        generatedAngles: result.generatedAngles,
        detailPageHtml: result.detailPageHtml,
        detailBundle: result.detailBundle,
        creditsUsed: (existing?.creditsUsed ?? 0) + angleCost - refundAmount,
      });
    }

    const hardFail = result.generatedAngles.some((a) => !a.imageBase64 && !a.imageUrl);
    const needsFixCount = result.generatedAngles.filter((a) => a.needsFix).length;
    if (result.successCount === 0) {
      return NextResponse.json(
        {
          error: "상세컷 생성에 실패했습니다. 크레딧은 전액 환불되었습니다.",
          code: "GENERATION_FAILED",
          generatedAngles: result.generatedAngles,
          creditsRefunded: refundAmount,
          credits,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      generatedAngles: result.generatedAngles,
      detailPageHtml: result.detailPageHtml,
      detailBundle: result.detailBundle,
      projectId,
      creditsDebited: angleCost - refundAmount,
      creditsRefunded: refundAmount,
      credits,
      partialFailure: hardFail,
      needsFixCount,
      successCount: result.successCount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "생성 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (msg === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "크레딧이 부족합니다.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
