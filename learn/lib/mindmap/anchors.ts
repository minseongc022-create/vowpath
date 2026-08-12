import type { MindmapAnchor, MindmapTreeNode } from "@/learn/types/material";
import {
  findLineForText,
  type TranscriptLine,
} from "@/learn/lib/mindmap/transcript-parse";

/** Attach video/PDF anchors to mindmap nodes for bidirectional sync */
export function enrichMindmapAnchors(
  tree: MindmapTreeNode[],
  transcriptLines: TranscriptLine[],
): MindmapTreeNode[] {
  return tree.map((node) => enrichNode(node, transcriptLines));
}

function enrichNode(
  node: MindmapTreeNode,
  lines: TranscriptLine[],
): MindmapTreeNode {
  const children = node.children?.map((c) => enrichNode(c, lines));
  const isLeaf = !children?.length;

  let anchor: MindmapAnchor | undefined = node.anchor;

  if (isLeaf && lines.length > 0) {
    const matched =
      findLineForText(lines, node.label) ??
      (node.summary ? findLineForText(lines, node.summary) : null);

    if (matched) {
      anchor = {
        startSec: matched.startSec,
        endSec: matched.endSec,
        lineId: matched.id,
        snippet: matched.text,
        charOffset: 0,
      };
    }
  } else if (children?.length) {
    const firstChildAnchor = children.find((c) => c.anchor?.startSec !== undefined);
    if (firstChildAnchor?.anchor) {
      anchor = {
        startSec: firstChildAnchor.anchor.startSec,
        endSec: firstChildAnchor.anchor.endSec,
        lineId: firstChildAnchor.anchor.lineId,
      };
    }
  }

  return { ...node, anchor, children };
}

export function buildAnchorIndex(
  tree: MindmapTreeNode[],
): Map<string, MindmapAnchor> {
  const map = new Map<string, MindmapAnchor>();

  function walk(nodes: MindmapTreeNode[]) {
    for (const n of nodes) {
      if (n.anchor) map.set(n.id, n.anchor);
      if (n.children) walk(n.children);
    }
  }

  walk(tree);
  return map;
}

export function findNodeAtTime(
  tree: MindmapTreeNode[],
  timeSec: number,
): string | null {
  let bestId: string | null = null;
  let bestStart = -1;

  function walk(nodes: MindmapTreeNode[]) {
    for (const n of nodes) {
      const a = n.anchor;
      if (a?.startSec !== undefined) {
        if (timeSec >= a.startSec && (a.endSec === undefined || timeSec < a.endSec)) {
          bestId = n.id;
          return;
        }
        if (a.startSec <= timeSec && a.startSec > bestStart) {
          bestStart = a.startSec;
          bestId = n.id;
        }
      }
      if (n.children) walk(n.children);
    }
  }

  walk(tree);
  return bestId;
}

export function buildLineToNodeMap(
  tree: MindmapTreeNode[],
): Map<string, string> {
  const map = new Map<string, string>();

  function walk(nodes: MindmapTreeNode[]) {
    for (const n of nodes) {
      if (n.anchor?.lineId) map.set(n.anchor.lineId, n.id);
      if (n.children) walk(n.children);
    }
  }

  walk(tree);
  return map;
}
