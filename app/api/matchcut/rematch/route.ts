import { NextResponse } from "next/server";
import {
  ensureOpenAiApiKeyLoaded,
  matchCutOpenAiErrorMessage,
} from "@/lib/matchcut/openai-config";
import { getProject, updateProject } from "@/lib/matchcut/projects-store";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import { matchReferenceToListing } from "@/lib/sourcing-detail/vision-match";
import type { ScrapedListing } from "@/lib/sourcing-detail/types";

export const maxDuration = 120;

/**
 * Re-run vision match against an edited listing gallery.
 * Free when the project already paid for the initial match.
 */
export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const projectId = String(body.projectId ?? "");
    const listing = body.listing as ScrapedListing | undefined;
    const referenceImageBase64 = String(body.referenceImageBase64 ?? "");
    const referenceMime = body.referenceMime ? String(body.referenceMime) : undefined;

    if (!projectId) {
      return NextResponse.json({ error: "projectId가 필요합니다." }, { status: 400 });
    }
    if (!listing) {
      return NextResponse.json({ error: "상품 정보가 필요합니다." }, { status: 400 });
    }
    if (!referenceImageBase64) {
      return NextResponse.json({ error: "실제 상품 사진이 필요합니다." }, { status: 400 });
    }
    if (!listing.images?.length) {
      return NextResponse.json(
        { error: "매칭할 상품 사진을 1장 이상 추가하세요." },
        { status: 400 },
      );
    }

    const existing = await getProject(session.sub, projectId);
    if (!existing) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const apiKey = await ensureOpenAiApiKeyLoaded();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: matchCutOpenAiErrorMessage("OPENAI_API_KEY_MISSING"),
          code: "OPENAI_API_KEY_MISSING",
        },
        { status: 503 },
      );
    }

    const match = await matchReferenceToListing({
      referenceImageBase64,
      referenceMime,
      images: listing.images,
      skuOptions: listing.skuOptions ?? [],
      title: listing.titleKo ?? listing.title,
    });

    const project = await updateProject(session.sub, projectId, {
      title: listing.titleKo || listing.title || existing.title,
      listing,
      match,
      selectedCandidate: match.bestMatch,
    });

    return NextResponse.json({
      ok: true,
      listing,
      match,
      projectId,
      project,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "재매칭 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const friendly = msg.startsWith("OPENAI_") ? matchCutOpenAiErrorMessage(msg) : msg;
    return NextResponse.json({ error: friendly, code: msg }, { status: 500 });
  }
}
