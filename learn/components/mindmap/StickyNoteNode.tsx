"use client";

import { memo, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import type { StickyNoteData } from "@/learn/lib/mindmap/tree-to-flow";

function StickyNoteNodeComponent({ data, selected }: NodeProps) {
  const d = data as StickyNoteData;
  const [text, setText] = useState(d.content);

  return (
    <div
      className="rounded-lg shadow-md border border-amber-200/80 min-w-[140px] max-w-[200px]"
      style={{ backgroundColor: d.color }}
    >
      <NodeResizer minWidth={120} minHeight={80} isVisible={selected} />
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span className="text-[9px] font-bold text-amber-800/70">필기</span>
        <button
          type="button"
          onClick={() => d.onDelete?.(d.annotationId)}
          className="text-[10px] text-amber-800/50 hover:text-red-600"
        >
          ✕
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => d.onChange?.(d.annotationId, text)}
        placeholder="메모…"
        className="w-full resize-none bg-transparent px-2 pb-2 text-xs text-amber-950 placeholder:text-amber-800/40 outline-none min-h-[72px]"
      />
    </div>
  );
}

export const StickyNoteNode = memo(StickyNoteNodeComponent);
