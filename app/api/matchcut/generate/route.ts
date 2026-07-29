import { NextResponse } from "next/server";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance } from "@/lib/matchcut/credits-store";
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

    const credits = await getCreditBalance(session.sub);

    return NextResponse.json({
      ok: true,
      ...result,
      creditsDebited: angleCost,
      credits,
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
