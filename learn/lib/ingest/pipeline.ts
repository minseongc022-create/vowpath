import {
  splitTextIntoChunks,
  splitTranscriptByDuration,
  segmentsToText,
  type TranscriptSegment,
} from "@/learn/lib/ingest/chunker";
import {
  fetchYouTubeTranscript,
  fetchYouTubeTitle,
  extractYouTubeVideoId,
} from "@/learn/lib/ingest/youtube";
import { extractPdfText } from "@/learn/lib/ingest/pdf";
import { stitchChunkTexts, buildTimestampedScript } from "@/learn/lib/ingest/stitcher";
import {
  analyzeMaterialContent,
  refineTranscriptChunk,
  demoAnalysis,
  isOpenAiConfigured,
} from "@/learn/lib/ingest/analyzer";
import {
  getMaterial,
  updateMaterial,
} from "@/learn/lib/library/repository";
import type { MaterialAnalysisRecord, MaterialStatus } from "@/learn/types/material";

export type IngestSource =
  | { type: "YOUTUBE"; url: string; pastedTranscript?: string }
  | { type: "PDF"; buffer: Buffer; fileName?: string }
  | { type: "TEXT" | "NOTE"; text: string; title?: string; sourceLabel?: string };

/** Full ingestion pipeline: extract → chunk → refine → stitch → analyze */
export async function runMaterialIngestion(
  userId: string,
  materialId: string,
  source?: IngestSource,
): Promise<void> {
  let material = await getMaterial(userId, materialId);
  if (!material) throw new Error("MATERIAL_NOT_FOUND");

  try {
    await setStatus(userId, materialId, "EXTRACTING");

    let rawText = "";
    let segments: TranscriptSegment[] = [];
    let titlePatch: string | undefined;

    if (source?.type === "YOUTUBE") {
      const videoId = extractYouTubeVideoId(source.url);
      if (!videoId) throw new Error("INVALID_YOUTUBE_URL");

      titlePatch = (await fetchYouTubeTitle(videoId)) ?? undefined;

      if (source.pastedTranscript?.trim()) {
        rawText = source.pastedTranscript.trim();
      } else {
        segments = await fetchYouTubeTranscript(videoId);
        rawText = segmentsToText(segments);
      }
    } else if (source?.type === "PDF") {
      rawText = await extractPdfText(source.buffer);
      titlePatch = source.fileName?.replace(/\.pdf$/i, "") ?? undefined;
    } else if (source?.type === "TEXT" || source?.type === "NOTE") {
      rawText = source.text.trim();
      titlePatch = source.title;
    } else {
      rawText = material.fullTranscript ?? "";
      if (!rawText) {
        const refreshed = await getMaterial(userId, materialId);
        rawText = refreshed?.fullTranscript ?? "";
      }
    }

    if (!rawText.trim()) {
      throw new Error("EMPTY_CONTENT");
    }

    await updateMaterial(userId, materialId, {
      title: titlePatch ?? material.title,
      rawText,
      status: "CHUNKING",
    });

    // ── Chunk strategy ──────────────────────────────────────────────────────
    const textChunks =
      segments.length > 0
        ? splitTranscriptByDuration(segments, 600).map(segmentsToText)
        : splitTextIntoChunks(rawText, { maxChars: 5500, overlap: 280 });

    const segmentGroups =
      segments.length > 0 ? splitTranscriptByDuration(segments, 600) : [];

    const chunkRecords = textChunks.map((content, i) => ({
      id: `chunk-${i}`,
      chunkIndex: i,
      startSec: segmentGroups[i]?.[0]?.startSec ?? null,
      endSec: segmentGroups[i]?.length
        ? (segmentGroups[i]![segmentGroups[i]!.length - 1]!.startSec +
            segmentGroups[i]![segmentGroups[i]!.length - 1]!.durationSec)
        : null,
      rawContent: content,
      cleanedContent: null as string | null,
      status: "pending",
    }));

    await updateMaterial(userId, materialId, {
      status: "TRANSCRIBING",
      chunks: chunkRecords,
    });

    // ── Refine each chunk (gap-free script) ─────────────────────────────────
    const refined: string[] = [];
    const useAi = isOpenAiConfigured();

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i]!;
      let cleaned = chunk;

      if (useAi && chunk.length > 80) {
        cleaned = await refineTranscriptChunk(chunk, {
          prevTail: refined[i - 1]?.slice(-300),
          nextHead: textChunks[i + 1]?.slice(0, 300),
        });
      }

      refined.push(cleaned);
      chunkRecords[i]!.cleanedContent = cleaned;
      chunkRecords[i]!.status = "done";

      await updateMaterial(userId, materialId, {
        chunks: [...chunkRecords],
      });
    }

    const fullTranscript = stitchChunkTexts(refined);
    const timestamped =
      segments.length > 0 ? buildTimestampedScript(segments) : fullTranscript;

    await setStatus(userId, materialId, "ANALYZING");
    await updateMaterial(userId, materialId, {
      fullTranscript: timestamped,
      searchableText: fullTranscript,
      chunks: chunkRecords,
    });

    // ── OpenAI analysis ─────────────────────────────────────────────────────
    material = (await getMaterial(userId, materialId))!;
    const analysisResult = useAi
      ? await analyzeMaterialContent(fullTranscript, material.title)
      : demoAnalysis(material.title, fullTranscript);

    const analysis: MaterialAnalysisRecord = {
      ...analysisResult,
      analyzedAt: new Date().toISOString(),
    };

    await updateMaterial(userId, materialId, {
      status: "READY",
      analysis,
      errorMessage: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "INGEST_FAILED";
    await updateMaterial(userId, materialId, {
      status: "FAILED",
      errorMessage: humanizeError(message),
    });
    throw e;
  }
}

async function setStatus(
  userId: string,
  materialId: string,
  status: MaterialStatus,
): Promise<void> {
  await updateMaterial(userId, materialId, { status });
}

function humanizeError(code: string): string {
  const map: Record<string, string> = {
    YOUTUBE_TRANSCRIPT_UNAVAILABLE:
      "YouTube 자막을 가져올 수 없습니다. 자막이 없거나 비공개일 수 있습니다. 텍스트를 직접 붙여넣어 주세요.",
    INVALID_YOUTUBE_URL: "올바른 YouTube URL을 입력해 주세요.",
    EMPTY_CONTENT: "분석할 내용이 없습니다.",
    OPENAI_API_KEY_MISSING:
      "OpenAI API 키가 설정되지 않았습니다. .env.local에 OPENAI_API_KEY를 추가해 주세요.",
    OPENAI_TIMEOUT: "AI 분석 시간이 초과되었습니다. 다시 시도해 주세요.",
  };
  return map[code] ?? `처리 중 오류: ${code}`;
}

/** Merge external pasted notes into existing material knowledge base. */
export async function appendMaterialText(
  userId: string,
  materialId: string,
  extraText: string,
): Promise<void> {
  const material = await getMaterial(userId, materialId);
  if (!material) throw new Error("MATERIAL_NOT_FOUND");

  const combined = [material.fullTranscript ?? material.rawText ?? "", extraText.trim()]
    .filter(Boolean)
    .join("\n\n---\n\n");

  await updateMaterial(userId, materialId, {
    searchableText: combined,
    fullTranscript: combined,
    status: "ANALYZING",
  });

  const useAi = isOpenAiConfigured();
  const analysisResult = useAi
    ? await analyzeMaterialContent(combined, material.title)
    : demoAnalysis(material.title, combined);

  await updateMaterial(userId, materialId, {
    status: "READY",
    analysis: { ...analysisResult, analyzedAt: new Date().toISOString() },
  });
}
