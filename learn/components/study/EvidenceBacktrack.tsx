"use client";

import { useEffect } from "react";
import type { QuizEvidence } from "@/learn/types/quiz";
import { useMindmapSyncOptional } from "@/learn/components/mindmap/MindmapSyncContext";

/** Jump video/transcript/mindmap to evidence location */
export function EvidenceSeeker({ target }: { target: QuizEvidence | null }) {
  const sync = useMindmapSyncOptional();

  useEffect(() => {
    if (!target || !sync) return;
    const timer = setTimeout(() => {
      if (target.nodeId) {
        sync.selectNode(target.nodeId, target.startSec, target.lineId);
      } else if (target.startSec !== undefined) {
        sync.setCurrentTimeSec(target.startSec);
        sync.seekRef.current?.(target.startSec);
        if (target.lineId) sync.scrollTranscriptRef.current?.(target.lineId);
      } else if (target.lineId) {
        sync.scrollTranscriptRef.current?.(target.lineId);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [target, sync]);

  return null;
}

export function BacktrackButton({
  evidence,
  onBacktrack,
  className,
}: {
  evidence: QuizEvidence;
  onBacktrack: (evidence: QuizEvidence) => void;
  className?: string;
}) {
  const hasTarget =
    evidence.startSec !== undefined || evidence.lineId || evidence.nodeId;

  if (!hasTarget && !evidence.snippet) return null;

  return (
    <button
      type="button"
      onClick={() => onBacktrack(evidence)}
      className={
        className ??
        "flex w-full items-center justify-center gap-2 rounded-2xl bg-learn-primary px-4 py-3.5 text-sm font-bold text-white shadow-learn-sm active:scale-[0.98] transition-transform"
      }
    >
      <span>📍</span>
      <span>근거 위치로 바로 이동</span>
    </button>
  );
}
