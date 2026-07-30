import { grantCredits } from "@/lib/matchcut/credits-store";
import {
  getGenerateJob,
  updateGenerateJob,
  type GenerateJob,
} from "@/lib/matchcut/jobs-store";
import { ensureOpenAiApiKeyLoaded } from "@/lib/matchcut/openai-config";
import { runGeneratePhase } from "@/lib/sourcing-detail/pipeline";

const THUMBNAIL_COUNT = 3;

/** Runs after the HTTP response — survives client leaving the page. */
export async function processGenerateJob(jobId: string): Promise<void> {
  const job = await getGenerateJob(jobId);
  if (!job || !job.input) return;
  if (job.status === "done" || job.status === "failed") return;

  await updateGenerateJob(jobId, { status: "running" });

  try {
    await ensureOpenAiApiKeyLoaded();
    const { input } = job;
    const withThumbnails = input.withThumbnails;
    const maxAngles = job.maxAngles;
    const totalCost = job.packCredits;

    const result = await runGeneratePhase({
      listing: input.listing,
      match: input.match,
      selectedCandidate: input.selectedCandidate,
      referenceImageBase64: input.referenceImageBase64,
      referenceMime: input.referenceMime,
      maxAngles,
      generateThumbnails: withThumbnails,
    });

    const expectedUnits = maxAngles + (withThumbnails ? THUMBNAIL_COUNT : 0);
    const successUnits =
      result.successCount + (withThumbnails ? result.thumbnailSuccessCount : 0);
    const failedUnits = Math.max(0, expectedUnits - successUnits);
    const refundAmount =
      expectedUnits > 0 ? Math.round((failedUnits / expectedUnits) * totalCost) : totalCost;

    if (refundAmount > 0) {
      await grantCredits(job.userId, refundAmount, "permanent");
    }

    const needsFixCount = result.generatedAngles.filter((a) => a.needsFix).length;

    if (job.projectId) {
      const { updateProject, getProject } = await import("@/lib/matchcut/projects-store");
      const existing = await getProject(job.userId, job.projectId);
      await updateProject(job.userId, job.projectId, {
        status: result.successCount > 0 ? "generated" : "matched",
        selectedCandidate: input.selectedCandidate,
        generatedAngles: result.generatedAngles,
        thumbnails: result.thumbnails,
        detailPageHtml: result.detailPageHtml,
        detailBundle: result.detailBundle,
        creditsUsed: (existing?.creditsUsed ?? 0) + totalCost - refundAmount,
        generateJobId: jobId,
      });
    }

    if (result.successCount === 0) {
      await updateGenerateJob(jobId, {
        status: "failed",
        error: "상세컷 생성에 실패했습니다. 크레딧은 환불되었습니다.",
        creditsDebited: 0,
        creditsRefunded: refundAmount,
        result: {
          generatedAngles: result.generatedAngles,
          thumbnails: result.thumbnails,
          detailPageHtml: result.detailPageHtml,
          detailBundle: result.detailBundle,
          successCount: 0,
          thumbnailSuccessCount: result.thumbnailSuccessCount,
          needsFixCount,
        },
      });
      return;
    }

    await updateGenerateJob(jobId, {
      status: "done",
      creditsDebited: totalCost - refundAmount,
      creditsRefunded: refundAmount,
      result: {
        generatedAngles: result.generatedAngles,
        thumbnails: result.thumbnails,
        detailPageHtml: result.detailPageHtml,
        detailBundle: result.detailBundle,
        successCount: result.successCount,
        thumbnailSuccessCount: result.thumbnailSuccessCount,
        needsFixCount,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "생성 실패";
    try {
      // Full refund on hard failure after debit
      const latest = await getGenerateJob(jobId);
      if (latest) {
        await grantCredits(latest.userId, latest.packCredits, "permanent");
        if (latest.projectId) {
          const { updateProject } = await import("@/lib/matchcut/projects-store");
          await updateProject(latest.userId, latest.projectId, {
            status: "matched",
            generateJobId: jobId,
          });
        }
      }
    } catch {
      /* ignore refund errors */
    }
    await updateGenerateJob(jobId, {
      status: "failed",
      error: msg,
      creditsRefunded: job.packCredits,
      creditsDebited: 0,
    });
  }
}

export function jobToClientPayload(job: GenerateJob) {
  return {
    jobId: job.id,
    projectId: job.projectId,
    status: job.status,
    error: job.error,
    creditsDebited: job.creditsDebited,
    creditsRefunded: job.creditsRefunded,
    ...(job.result
      ? {
          generatedAngles: job.result.generatedAngles,
          thumbnails: job.result.thumbnails,
          detailPageHtml: job.result.detailPageHtml,
          detailBundle: job.result.detailBundle,
          successCount: job.result.successCount,
          thumbnailSuccessCount: job.result.thumbnailSuccessCount,
          needsFixCount: job.result.needsFixCount,
        }
      : {}),
  };
}
