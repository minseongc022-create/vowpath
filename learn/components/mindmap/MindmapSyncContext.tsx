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
  currentTimeSec: number;
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
  const [currentTimeSec, setCurrentTimeSecRaw] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const seekRef = useRef<((sec: number) => void) | null>(null);
  const scrollTranscriptRef = useRef<((lineId: string) => void) | null>(null);

  const activeNodeId = useMemo(
    () => findNodeAtTime(mindmapTree, currentTimeSec),
    [mindmapTree, currentTimeSec],
  );

  const setCurrentTimeSec = useCallback((t: number) => {
    setCurrentTimeSecRaw(t);
  }, []);

  const selectNode = useCallback(
    (nodeId: string, startSec?: number, lineId?: string) => {
      setSelectedNodeId(nodeId);
      if (startSec !== undefined) {
        seekRef.current?.(startSec);
        setCurrentTimeSecRaw(startSec);
      }
      if (lineId) {
        scrollTranscriptRef.current?.(lineId);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      currentTimeSec,
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
      currentTimeSec,
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
