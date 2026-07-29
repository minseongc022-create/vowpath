import { NextResponse } from "next/server";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance } from "@/lib/matchcut/credits-store";
import { runMatchPhase } from "@/lib/sourcing-detail/pipeline";
import { isSupportedListingUrl, normalizeListingUrl } from "@/lib/sourcing-detail/platforms";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const url = normalizeListingUrl(String(body.url ?? ""));
    const referenceImageBase64 = String(body.referenceImageBase64 ?? "");
    const referenceMime = body.referenceMime ? String(body.referenceMime) : undefined;

    if (!url) {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }
    if (!isSupportedListingUrl(url)) {
      return NextResponse.json(
        { error: "1688, 타오바오, 티몰, 알리익스프레스 URL만 지원합니다." },
        { status: 400 },
      );
    }
    if (!referenceImageBase64) {
      return NextResponse.json({ error: "실제 상품 사진이 필요합니다." }, { status: 400 });
    }

    await debitCredits(session.sub, CREDIT_COSTS.match);

    const { listing, match } = await runMatchPhase({
      url,
      referenceImageBase64,
      referenceMime,
    });

    const credits = await getCreditBalance(session.sub);

    const { createProject } = await import("@/lib/matchcut/projects-store");
    const project = await createProject({
      userId: session.sub,
      title: listing.title ?? "매칭 프로젝트",
      sourceUrl: listing.url,
      platform: listing.platform,
      listing,
      match,
      selectedCandidate: match.bestMatch,
      creditsUsed: CREDIT_COSTS.match,
    });

    return NextResponse.json({
      ok: true,
      listing,
      match,
      projectId: project.id,
      creditsDebited: CREDIT_COSTS.match,
      credits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "매칭 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (msg === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "크레딧이 부족합니다. 요금제에서 충전하세요.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
