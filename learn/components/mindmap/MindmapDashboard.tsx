"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MaterialRecord, MindmapAnnotation, MindmapTreeNode } from "@/learn/types/material";
import { parseTranscript } from "@/learn/lib/mindmap/transcript-parse";
import { enrichMindmapAnchors } from "@/learn/lib/mindmap/anchors";
import { MindmapSyncProvider } from "@/learn/components/mindmap/MindmapSyncContext";
import { InteractiveMindmapFlow } from "@/learn/components/mindmap/InteractiveMindmapFlow";
import { SyncedYouTubePlayer } from "@/learn/components/mindmap/SyncedYouTubePlayer";
import { SyncedTranscript } from "@/learn/components/mindmap/SyncedTranscript";
import { extractYouTubeVideoId } from "@/learn/lib/ingest/youtube";
import Link from "next/link";
import type { QuizEvidence } from "@/learn/types/quiz";
import { EvidenceSeeker } from "@/learn/components/study/EvidenceBacktrack";

type Props = {
  material: MaterialRecord;
  compact?: boolean;
  youtubeUrl?: string | null;
  fallbackTree?: MindmapTreeNode[];
  seekTarget?: QuizEvidence | null;
};

export function MindmapDashboard({
  material,
  compact = false,
  youtubeUrl,
  fallbackTree = [],
  seekTarget = null,
}: Props) {
  const [annotations, setAnnotations] = useState<MindmapAnnotation[]>([]);
  const [leftTab, setLeftTab] = useState<"video" | "script">("video");

  const transcriptLines = useMemo(
    () => parseTranscript(material.fullTranscript),
    [material.fullTranscript],
  );

  const rawTree =
    material.analysis?.mindmapTree?.length
      ? material.analysis.mindmapTree
      : fallbackTree;

  const mindmapTree = useMemo(
    () => enrichMindmapAnchors(rawTree, transcriptLines),
    [rawTree, transcriptLines],
  );

  const ytUrl =
    youtubeUrl ??
    material.sourceUrl ??
    (material.type === "YOUTUBE" ? material.sourceUrl : null);
  const hasYoutube = ytUrl && extractYouTubeVideoId(ytUrl);

  const refreshAnnotations = useCallback(async () => {
    const res = await fetch(`/learn/api/mindmap/${material.id}/annotations`);
    if (res.ok) setAnnotations(await res.json());
  }, [material.id]);

  useEffect(() => {
    void refreshAnnotations();
  }, [refreshAnnotations]);

  const inner = (
    <div
      className={
        compact
          ? "flex h-full min-h-[300px] flex-col learn-mindmap-flow"
          : "grid min-h-[calc(100dvh-8rem)] gap-4 lg:grid-cols-2 learn-mindmap-flow"
      }
    >
      {!compact && (
        <div className="flex flex-col rounded-2xl border border-learn-border bg-learn-surface overflow-hidden">
          <div className="flex border-b border-learn-border">
            {(["video", "script"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLeftTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold ${
                  leftTab === t
                    ? "text-learn-primary border-b-2 border-learn-primary"
                    : "text-learn-ink-muted"
                }`}
              >
                {t === "video" ? "영상" : "스크립트"}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 p-3">
            {leftTab === "video" && hasYoutube ? (
              <SyncedYouTubePlayer youtubeUrl={ytUrl!} />
            ) : leftTab === "video" ? (
              <div className="flex h-48 items-center justify-center rounded-xl bg-learn-muted text-sm text-learn-ink-muted">
                강의 링크를 연결하면 영상-마인드맵 싱크가 활성화됩니다
              </div>
            ) : (
              <SyncedTranscript />
            )}
          </div>
          {leftTab === "video" && hasYoutube && (
            <div className="border-t border-learn-border max-h-[180px]">
              <SyncedTranscript compact />
            </div>
          )}
        </div>
      )}

      <div
        className={
          compact
            ? "flex-1 min-h-0 rounded-xl border border-learn-border bg-learn-surface overflow-hidden"
            : "rounded-2xl border border-learn-border bg-learn-surface overflow-hidden flex flex-col"
        }
      >
        {!compact && (
          <div className="flex items-center justify-between border-b border-learn-border px-4 py-2">
            <div>
              <h2 className="text-sm font-bold text-learn-ink">실시간 인터랙티브 마인드맵</h2>
              <p className="text-[11px] text-learn-ink-muted">
                노드 클릭 → 영상·스크립트 이동 · 재생 중 노드 하이라이트 · 필기 레이어
              </p>
            </div>
            <Link
              href={`/learn/library/${material.id}`}
              className="text-xs font-medium text-learn-primary"
            >
              자료 상세
            </Link>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <InteractiveMindmapFlow
            tree={mindmapTree}
            materialId={material.id}
            compact={compact}
            annotations={annotations}
            onAnnotationsChange={refreshAnnotations}
          />
        </div>
      </div>
    </div>
  );

  return (
    <MindmapSyncProvider mindmapTree={mindmapTree} transcriptLines={transcriptLines}>
      <EvidenceSeeker target={seekTarget} />
      {inner}
    </MindmapSyncProvider>
  );
}
