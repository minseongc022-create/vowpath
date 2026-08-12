"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/learn/lib/utils";
import { useMindmapSyncOptional } from "@/learn/components/mindmap/MindmapSyncContext";
import { buildLineToNodeMap } from "@/learn/lib/mindmap/anchors";

type Props = {
  className?: string;
  compact?: boolean;
};

export function SyncedTranscript({ className, compact }: Props) {
  const sync = useMindmapSyncOptional();
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const lineToNode = sync
    ? buildLineToNodeMap(sync.mindmapTree)
    : new Map<string, string>();

  const scrollToLine = useCallback((lineId: string) => {
    const el = lineRefs.current.get(lineId);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  useEffect(() => {
    if (!sync) return;
    sync.scrollTranscriptRef.current = scrollToLine;
    return () => {
      sync.scrollTranscriptRef.current = null;
    };
  }, [sync, scrollToLine]);

  useEffect(() => {
    if (!sync?.activeNodeId) return;
    for (const [lineId, nodeId] of lineToNode.entries()) {
      if (nodeId === sync.activeNodeId) {
        scrollToLine(lineId);
        break;
      }
    }
  }, [sync?.activeNodeId, lineToNode, scrollToLine]);

  if (!sync?.transcriptLines.length) {
    return (
      <p className="p-4 text-sm text-learn-ink-muted text-center">
        스크립트가 없습니다. 저장소에서 자료를 AI 소화해 주세요.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "learn-scroll overflow-y-auto",
        compact ? "max-h-[200px] p-2" : "max-h-[min(50dvh,400px)] p-3",
        className,
      )}
    >
      {sync.transcriptLines.map((line) => {
        const linkedNode = lineToNode.get(line.id);
        const isActive =
          sync.activeNodeId && linkedNode === sync.activeNodeId;
        const isSelected =
          sync.selectedNodeId && linkedNode === sync.selectedNodeId;

        return (
          <div
            key={line.id}
            ref={(el) => {
              if (el) lineRefs.current.set(line.id, el);
            }}
            id={`transcript-${line.id}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (linkedNode) {
                sync.selectNode(linkedNode, line.startSec, line.id);
              } else {
                sync.setCurrentTimeSec(line.startSec);
                sync.seekRef.current?.(line.startSec);
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
            className={cn(
              "mb-1.5 rounded-lg px-3 py-2 text-sm leading-relaxed cursor-pointer transition-colors border",
              isActive
                ? "border-learn-primary bg-learn-primary/10 text-learn-ink font-medium"
                : isSelected
                  ? "border-learn-primary/40 bg-blue-50/80"
                  : "border-transparent text-learn-ink-muted hover:bg-learn-muted/60",
            )}
          >
            {line.startSec > 0 && (
              <span className="mr-2 text-[10px] font-mono font-bold text-learn-primary">
                [{formatTs(line.startSec)}]
              </span>
            )}
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
