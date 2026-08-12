"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MindmapTreeNode } from "@/learn/types/material";
import type { TranscriptLine } from "@/learn/lib/mindmap/transcript-parse";
import { findNodeAtTime } from "@/learn/lib/mindmap/anchors";

type MindmapSyncContextValue = {
  activeNodeId: string | null;
  selectedNodeId: string | null;
  transcriptLines: TranscriptLine[];
  mindmapTree: MindmapTreeNode[];
  setCurrentTimeSec: (t: number) => void;
  selectNode: (nodeId: string, startSec?: number, lineId?: string) => void;
  seekRef: React.MutableRefObject<((sec: number) => void) | null>;
  scrollTranscriptRef: React.MutableRefObject<((lineId: string) => void) | null>;
};

const MindmapSyncContext = createContext<MindmapSyncContextValue | null>(null);

export function MindmapSyncProvider({
  children,
  mindmapTree,
  transcriptLines,
}: {
  children: React.ReactNode;
  mindmapTree: MindmapTreeNode[];
  transcriptLines: TranscriptLine[];
}) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const seekRef = useRef<((sec: number) => void) | null>(null);
  const scrollTranscriptRef = useRef<((lineId: string) => void) | null>(null);
  const mindmapTreeRef = useRef(mindmapTree);
  mindmapTreeRef.current = mindmapTree;

  const setCurrentTimeSec = useCallback((t: number) => {
    const next = findNodeAtTime(mindmapTreeRef.current, t);
    setActiveNodeId((prev) => (prev === next ? prev : next));
  }, []);

  const selectNode = useCallback(
    (nodeId: string, startSec?: number, lineId?: string) => {
      setSelectedNodeId(nodeId);
      if (startSec !== undefined) {
        seekRef.current?.(startSec);
        const next = findNodeAtTime(mindmapTreeRef.current, startSec);
        setActiveNodeId(next);
      }
      if (lineId) {
        scrollTranscriptRef.current?.(lineId);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      activeNodeId,
      selectedNodeId,
      transcriptLines,
      mindmapTree,
      setCurrentTimeSec,
      selectNode,
      seekRef,
      scrollTranscriptRef,
    }),
    [
      activeNodeId,
      selectedNodeId,
      transcriptLines,
      mindmapTree,
      setCurrentTimeSec,
      selectNode,
    ],
  );

  return (
    <MindmapSyncContext.Provider value={value}>{children}</MindmapSyncContext.Provider>
  );
}

export function useMindmapSync() {
  const ctx = useContext(MindmapSyncContext);
  if (!ctx) throw new Error("useMindmapSync requires MindmapSyncProvider");
  return ctx;
}

export function useMindmapSyncOptional() {
  return useContext(MindmapSyncContext);
}
