import type { MindmapTreeNode } from "@/learn/types/material";
import type { QuizEvidence } from "@/learn/types/quiz";
import { findLineForText, type TranscriptLine } from "@/learn/lib/mindmap/transcript-parse";
import { buildLineToNodeMap } from "@/learn/lib/mindmap/anchors";

/** Resolve evidence snippet to video/transcript/mindmap anchors */
export function resolveEvidenceAnchor(
  snippet: string,
  transcriptLines: TranscriptLine[],
  mindmapTree: MindmapTreeNode[],
  sectionTitle?: string,
): QuizEvidence {
  const evidence: QuizEvidence = {
    snippet: snippet.slice(0, 200),
    sectionTitle,
  };

  if (!snippet.trim()) return evidence;

  const line = findLineForText(transcriptLines, snippet);
  if (line) {
    evidence.startSec = line.startSec;
    evidence.lineId = line.id;
    const lineToNode = buildLineToNodeMap(mindmapTree);
    evidence.nodeId = lineToNode.get(line.id);
  }

  if (!evidence.nodeId) {
    evidence.nodeId = findNodeByLabel(mindmapTree, snippet) ?? findNodeByLabel(mindmapTree, sectionTitle ?? "");
  }

  return evidence;
}

function findNodeByLabel(tree: MindmapTreeNode[], query: string): string | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  let found: string | undefined;

  function walk(nodes: MindmapTreeNode[]) {
    for (const n of nodes) {
      const label = n.label.toLowerCase();
      const summary = n.summary?.toLowerCase() ?? "";
      if (label.includes(q) || q.includes(label) || summary.includes(q)) {
        found = n.id;
        return;
      }
      if (n.children) walk(n.children);
    }
  }

  walk(tree);
  return found;
}

/** Normalize short-answer text for comparison */
export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "").replace(/[.,!?]/g, "");
}

export function gradeShortAnswer(userAnswer: string, correctAnswer: string): boolean {
  const u = normalizeAnswer(userAnswer);
  const c = normalizeAnswer(correctAnswer);
  if (!u) return false;
  if (u === c) return true;
  if (c.includes(u) || u.includes(c)) return true;
  const cWords = correctAnswer.split(/\s+/).filter((w) => w.length > 1);
  const matched = cWords.filter((w) => userAnswer.toLowerCase().includes(w.toLowerCase()));
  return matched.length >= Math.ceil(cWords.length * 0.6);
}
