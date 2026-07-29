import { NextResponse } from "next/server";
import { runGeneratePhase } from "@/lib/sourcing-detail/pipeline";
import type { MatchCandidate, MatchResult, ScrapedListing } from "@/lib/sourcing-detail/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
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

    const result = await runGeneratePhase({
      listing,
      match,
      selectedCandidate,
      referenceImageBase64,
      referenceMime,
      maxAngles,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "생성 실패" },
      { status: 500 },
    );
  }
}
