/** Merge chunk outputs with overlap deduplication for gap-free transcripts. */
export function stitchChunkTexts(chunks: string[], overlapChars = 240): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return chunks[0]!.trim();

  let result = chunks[0]!.trim();

  for (let i = 1; i < chunks.length; i++) {
    const next = chunks[i]!.trim();
    if (!next) continue;

    const tail = result.slice(-overlapChars);
    const head = next.slice(0, overlapChars);
    const merged = mergeOverlappingStrings(tail, head);

    if (merged.length > 0) {
      result = result.slice(0, -merged.length) + next;
    } else {
      result = `${result}\n\n${next}`;
    }
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function mergeOverlappingStrings(a: string, b: string): string {
  const max = Math.min(a.length, b.length);
  for (let len = max; len >= 20; len--) {
    if (a.slice(-len) === b.slice(0, len)) {
      return a.slice(-len);
    }
  }
  const normalizedA = a.replace(/\s+/g, " ").trim();
  const normalizedB = b.replace(/\s+/g, " ").trim();
  for (let len = Math.min(normalizedA.length, normalizedB.length); len >= 20; len--) {
    if (normalizedA.slice(-len) === normalizedB.slice(0, len)) {
      return a.slice(-Math.min(len, a.length));
    }
  }
  return "";
}

/** Build timestamped full script from segments. */
export function buildTimestampedScript(
  segments: { text: string; startSec: number }[],
): string {
  return segments
    .map((s) => `[${formatTs(s.startSec)}] ${s.text.trim()}`)
    .join("\n");
}

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
