import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { MindmapTreeNode } from "@/learn/types/material";

export type ConceptNodeData = {
  label: string;
  summary?: string;
  nodeId: string;
  startSec?: number;
  lineId?: string;
  isActive?: boolean;
  isSelected?: boolean;
  onNodeClick?: (nodeId: string) => void;
};

export type StickyNoteData = {
  annotationId: string;
  content: string;
  color: string;
  onChange?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
};

const NODE_W = 168;
const NODE_H = 56;

export function mindmapTreeToFlow(
  tree: MindmapTreeNode[],
  opts?: { direction?: "LR" | "TB" },
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: opts?.direction ?? "LR", nodesep: 40, ranksep: 70 });

  const flat: { id: string; label: string; summary?: string; parent?: string; anchor?: MindmapTreeNode["anchor"] }[] = [];

  function flatten(nodes: MindmapTreeNode[], parent?: string) {
    for (const n of nodes) {
      flat.push({
        id: n.id,
        label: n.label,
        summary: n.summary,
        parent,
        anchor: n.anchor,
      });
      g.setNode(n.id, { width: NODE_W, height: NODE_H });
      if (parent) {
        g.setEdge(parent, n.id);
      }
      if (n.children?.length) flatten(n.children, n.id);
    }
  }

  flatten(tree);
  dagre.layout(g);

  const nodes: Node[] = flat.map((item) => {
    const pos = g.node(item.id);
    return {
      id: item.id,
      type: "concept",
      position: {
        x: (pos?.x ?? 0) - NODE_W / 2,
        y: (pos?.y ?? 0) - NODE_H / 2,
      },
      data: {
        label: item.label,
        summary: item.summary,
        nodeId: item.id,
        startSec: item.anchor?.startSec,
        lineId: item.anchor?.lineId,
      } satisfies ConceptNodeData,
    };
  });

  const edges: Edge[] = flat
    .filter((f) => f.parent)
    .map((f) => ({
      id: `e-${f.parent}-${f.id}`,
      source: f.parent!,
      target: f.id,
      type: "smoothstep",
      animated: false,
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

export function stickyToFlowNote(
  ann: { id: string; x: number; y: number; content: string; color?: string },
): Node {
  return {
    id: `note-${ann.id}`,
    type: "stickyNote",
    position: { x: ann.x, y: ann.y },
    data: {
      annotationId: ann.id,
      content: ann.content,
      color: ann.color ?? "#FEF3C7",
    } satisfies StickyNoteData,
    draggable: true,
  };
}
