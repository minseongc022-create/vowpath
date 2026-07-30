import { after } from "next/server";
import { NextResponse } from "next/server";
import { getAnglePackage } from "@/lib/matchcut/constants";
import { debitCredits, getCreditBalance } from "@/lib/matchcut/credits-store";
import { jobToClientPayload, processGenerateJob } from "@/lib/matchcut/generate-job";
import {
  createGenerateJob,
  getGenerateJob,
  listActiveGenerateJobs,
  publicGenerateJob,
} from "@/lib/matchcut/jobs-store";
import {
  ensureOpenAiApiKeyLoaded,
  matchCutOpenAiErrorMessage,
} from "@/lib/matchcut/openai-config";
import { requireMatchCutSession } from "@/lib/matchcut/session";
import type { MatchCandidate, MatchResult, ScrapedListing } from "@/lib/sourcing-detail/types";

export const maxDuration = 300;

/** Enqueue background generate — returns immediately so leaving the page does not cancel work. */
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
    const withThumbnails = body.withThumbnails !== false;
    const pack = getAnglePackage(maxAngles);
    const projectId = body.projectId ? String(body.projectId) : null;

    if (!listing || !match || !selectedCandidate) {
      return NextResponse.json({ error: "매칭 데이터가 필요합니다." }, { status: 400 });
    }
    if (!referenceImageBase64) {
      return NextResponse.json({ error: "실제 상품 사진이 필요합니다." }, { status: 400 });
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

    await debitCredits(session.sub, pack.credits);

    const job = await createGenerateJob({
      userId: session.sub,
      projectId,
      packCredits: pack.credits,
      maxAngles,
      payload: {
        listing,
        match,
        selectedCandidate,
        referenceImageBase64,
        referenceMime,
        withThumbnails,
      },
    });

    if (projectId) {
      const { updateProject } = await import("@/lib/matchcut/projects-store");
      await updateProject(session.sub, projectId, {
        status: "generating",
        selectedCandidate,
        generateJobId: job.id,
      });
    }

    after(() => {
      void processGenerateJob(job.id);
    });

    const credits = await getCreditBalance(session.sub);

    return NextResponse.json({
      ok: true,
      queued: true,
      jobId: job.id,
      projectId,
      status: job.status,
      pack,
      creditsDebited: pack.credits,
      credits,
      message: "상세컷 생성을 백그라운드에서 시작했습니다. 앱을 나가도 계속 진행됩니다.",
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

/** Poll job status (and active jobs for the user). */
export async function GET(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const job = await getGenerateJob(jobId, session.sub);
      if (!job) {
        return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
      }
      const credits = await getCreditBalance(session.sub);
      return NextResponse.json({
        ok: true,
        job: publicGenerateJob(job),
        ...jobToClientPayload(job),
        credits,
      });
    }

    const active = await listActiveGenerateJobs(session.sub);
    return NextResponse.json({
      ok: true,
      jobs: active.map(publicGenerateJob),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "조회 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
