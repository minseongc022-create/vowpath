"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/learn/lib/utils";
import type { ConceptNodeData } from "@/learn/lib/mindmap/tree-to-flow";

function ConceptNodeComponent({ data, selected }: NodeProps) {
  const d = data as ConceptNodeData;
  const active = d.isActive;
  const hasAnchor = d.startSec !== undefined;

  return (
    <button
      type="button"
      onClick={() => d.onNodeClick?.(d.nodeId)}
      className={cn(
        "w-[168px] rounded-xl border px-3 py-2 text-left shadow-learn-sm transition-all duration-150",
        active
          ? "border-learn-primary bg-learn-primary text-white shadow-[0_0_0_3px_rgba(49,130,246,0.35)] scale-[1.03]"
          : selected
            ? "border-learn-primary bg-blue-50 text-learn-ink"
            : "border-learn-border bg-learn-surface text-learn-ink hover:border-learn-primary/50",
        hasAnchor && "cursor-pointer",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-learn-primary !w-2 !h-2 !border-0" />
      <p className="text-xs font-bold leading-snug line-clamp-2">{d.label}</p>
      {d.summary && !active && (
        <p className="mt-0.5 text-[10px] text-learn-ink-muted line-clamp-1">{d.summary}</p>
      )}
      {hasAnchor && (
        <p className={cn("mt-1 text-[9px] font-medium", active ? "text-white/80" : "text-learn-primary")}>
          {formatTs(d.startSec!)} · 클릭 시 이동
        </p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-learn-primary !w-2 !h-2 !border-0" />
    </button>
  );
}

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const ConceptNode = memo(ConceptNodeComponent);
