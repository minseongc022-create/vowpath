"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "@/learn/styles/mindmap-flow.css";

import { ConceptNode } from "@/learn/components/mindmap/ConceptNode";
import { StickyNoteNode } from "@/learn/components/mindmap/StickyNoteNode";
import {
  mindmapTreeToFlow,
  stickyToFlowNote,
  type ConceptNodeData,
} from "@/learn/lib/mindmap/tree-to-flow";
import type { MindmapAnnotation, MindmapTreeNode } from "@/learn/types/material";
import { useMindmapSyncOptional } from "@/learn/components/mindmap/MindmapSyncContext";
import Link from "next/link";

const nodeTypes: NodeTypes = {
  concept: ConceptNode,
  stickyNote: StickyNoteNode,
};

type Props = {
  tree: MindmapTreeNode[];
  materialId?: string;
  compact?: boolean;
  annotations?: MindmapAnnotation[];
  onAnnotationsChange?: () => void;
};

export function InteractiveMindmapFlow({
  tree,
  materialId,
  compact = false,
  annotations = [],
  onAnnotationsChange,
}: Props) {
  const sync = useMindmapSyncOptional();
  const base = useMemo(() => mindmapTreeToFlow(tree), [tree]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(base.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(base.edges);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = treeFlat(tree).find((n) => n.id === nodeId);
      if (!node) return;
      sync?.selectNode(
        nodeId,
        node.anchor?.startSec,
        node.anchor?.lineId,
      );
    },
    [sync, tree],
  );

  useEffect(() => {
    const { nodes: n, edges: e } = mindmapTreeToFlow(tree);
    const noteNodes = annotations.map((a) => stickyToFlowNote(a));
    const enriched = n.map((node) => {
      const d = node.data as ConceptNodeData;
      return {
        ...node,
        data: {
          ...d,
          isActive: sync?.activeNodeId === d.nodeId,
          isSelected: sync?.selectedNodeId === d.nodeId,
          onNodeClick: handleNodeClick,
        },
      };
    });
    setNodes([...enriched, ...noteNodes]);
    setEdges(e);
  }, [
    tree,
    annotations,
    sync?.activeNodeId,
    sync?.selectedNodeId,
    handleNodeClick,
    setNodes,
    setEdges,
  ]);

  const saveNote = useCallback(
    async (id: string, content: string) => {
      if (!materialId) return;
      const noteNode = nodes.find((n) => n.id === `note-${id}`);
      await fetch(`/learn/api/mindmap/${materialId}/annotations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          content,
          x: noteNode?.position.x ?? 0,
          y: noteNode?.position.y ?? 0,
        }),
      });
      onAnnotationsChange?.();
    },
    [materialId, nodes, onAnnotationsChange],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (!materialId) return;
      await fetch(`/learn/api/mindmap/${materialId}/annotations?id=${id}`, {
        method: "DELETE",
      });
      onAnnotationsChange?.();
    },
    [materialId, onAnnotationsChange],
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === "stickyNote") {
          const d = n.data as { annotationId: string; content: string; color: string };
          return {
            ...n,
            data: {
              ...d,
              onChange: saveNote,
              onDelete: deleteNote,
            },
          };
        }
        return n;
      }),
    );
  }, [saveNote, deleteNote, setNodes]);

  const onNodeDragStop = useCallback(
    async (_: unknown, node: Node) => {
      if (node.type !== "stickyNote" || !materialId) return;
      const d = node.data as { annotationId: string; content: string };
      await fetch(`/learn/api/mindmap/${materialId}/annotations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: d.annotationId,
          content: d.content,
          x: node.position.x,
          y: node.position.y,
        }),
      });
    },
    [materialId],
  );

  async function addStickyNote() {
    if (!materialId) return;
    const res = await fetch(`/learn/api/mindmap/${materialId}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x: 40 + Math.random() * 80,
        y: 40 + Math.random() * 80,
        content: "",
      }),
    });
    if (res.ok) onAnnotationsChange?.();
  }

  return (
    <div className={`relative learn-mindmap-flow ${compact ? "h-full min-h-[280px]" : "h-[min(70dvh,640px)]"} w-full`}>
        {!compact && materialId && (
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              type="button"
              onClick={() => void addStickyNote()}
              className="rounded-lg bg-learn-surface border border-learn-border px-3 py-1.5 text-xs font-semibold text-learn-ink shadow-learn-sm hover:bg-learn-muted"
            >
              + 필기 메모
            </button>
          </div>
        )}
        {compact && materialId && (
          <button
            type="button"
            onClick={() => void addStickyNote()}
            className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-learn-primary text-white shadow-learn-md text-lg font-bold"
            title="필기 메모 추가"
          >
            +
          </button>
        )}
        {compact && materialId && (
          <Link
            href={`/learn/library/${materialId}/mindmap`}
            className="absolute top-2 right-2 z-10 rounded-lg bg-learn-primary px-2 py-1 text-[10px] font-bold text-white shadow-learn-sm"
          >
            전체화면
          </Link>
        )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: compact ? 0.2 : 0.15 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
      >
        <Background color="#e5e8eb" gap={16} />
        {!compact && <MiniMap pannable zoomable className="!bg-learn-surface" />}
        <Controls showInteractive={false} className="!shadow-learn-sm" />
      </ReactFlow>
    </div>
  );
}

function treeFlat(tree: MindmapTreeNode[]): MindmapTreeNode[] {
  const out: MindmapTreeNode[] = [];
  function walk(nodes: MindmapTreeNode[]) {
    for (const n of nodes) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(tree);
  return out;
}
