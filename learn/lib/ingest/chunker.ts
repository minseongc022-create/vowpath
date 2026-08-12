/** Split long text into overlapping chunks for gap-free AI processing. */
export function splitTextIntoChunks(
  text: string,
  opts?: { maxChars?: number; overlap?: number },
): string[] {
  const maxChars = opts?.maxChars ?? 5500;
  const overlap = opts?.overlap ?? 280;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("。"),
      );
      if (breakAt > maxChars * 0.5) {
        end = start + breakAt + 1;
      }
    }

    chunks.push(normalized.slice(start, end).trim());
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

export type TranscriptSegment = {
  text: string;
  startSec: number;
  durationSec: number;
};

/** Group timed captions into ~N-minute chunks for parallel refinement. */
export function splitTranscriptByDuration(
  segments: TranscriptSegment[],
  chunkDurationSec = 600,
): TranscriptSegment[][] {
  if (segments.length === 0) return [];

  const groups: TranscriptSegment[][] = [];
  let current: TranscriptSegment[] = [];
  let windowStart = segments[0]?.startSec ?? 0;

  for (const seg of segments) {
    if (seg.startSec - windowStart >= chunkDurationSec && current.length > 0) {
      groups.push(current);
      current = [];
      windowStart = seg.startSec;
    }
    current.push(seg);
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

export function segmentsToText(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
