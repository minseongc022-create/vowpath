import { NextResponse } from "next/server";
import { CREDIT_COSTS } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance, grantCredits } from "@/lib/matchcut/credits-store";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import { fixProductAngle } from "@/lib/sourcing-detail/vision-generate";

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const angle = String(body.angle ?? "fix");
    const userInstruction = String(body.userInstruction ?? "").trim();
    const userReferenceBase64 = String(body.referenceImageBase64 ?? "");
    const brokenImageBase64 = String(body.brokenImageBase64 ?? "");
    const referenceMime = body.referenceMime ? String(body.referenceMime) : undefined;
    const productDescription = body.productDescription
      ? String(body.productDescription)
      : undefined;
    const mustPreserve = Array.isArray(body.mustPreserve)
      ? body.mustPreserve.map(String)
      : undefined;
    const projectId = body.projectId ? String(body.projectId) : null;

    if (!userReferenceBase64 || !brokenImageBase64) {
      return NextResponse.json(
        { error: "원본 사진과 수정할 이미지가 필요합니다." },
        { status: 400 },
      );
    }
    if (!userInstruction) {
      return NextResponse.json(
        { error: "AI에게 어떻게 고칠지 적어 주세요." },
        { status: 400 },
      );
    }

    await debitCredits(session.sub, CREDIT_COSTS.fixAngle);

    const fixed = await fixProductAngle({
      userReferenceBase64,
      userReferenceMime: referenceMime,
      brokenImageBase64,
      angle,
      userInstruction,
      productDescription,
      mustPreserve,
    });

    if (!fixed.imageBase64 && !fixed.imageUrl) {
      await grantCredits(session.sub, CREDIT_COSTS.fixAngle, "permanent");
      const credits = await getCreditBalance(session.sub);
      return NextResponse.json(
        {
          error: "수정에 실패했습니다. 크레딧은 환불되었습니다.",
          code: "FIX_FAILED",
          credits,
        },
        { status: 422 },
      );
    }

    if (projectId) {
      const { getProject, updateProject } = await import("@/lib/matchcut/projects-store");
      const existing = await getProject(session.sub, projectId);
      if (existing?.generatedAngles) {
        const nextAngles = existing.generatedAngles.map((a) =>
          a.angle === angle ? fixed : a,
        );
        await updateProject(session.sub, projectId, {
          generatedAngles: nextAngles,
          creditsUsed: (existing.creditsUsed ?? 0) + CREDIT_COSTS.fixAngle,
        });
      }
    }

    const credits = await getCreditBalance(session.sub);
    return NextResponse.json({
      ok: true,
      angle: fixed,
      creditsDebited: CREDIT_COSTS.fixAngle,
      credits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "수정 실패";
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
