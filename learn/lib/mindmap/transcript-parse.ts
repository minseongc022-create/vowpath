export type TranscriptLine = {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
};

const TS_LINE = /^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.*)$/;

/** Parse timestamped script lines like `[02:15] hello` */
export function parseTimestampedTranscript(raw: string): TranscriptLine[] {
  const lines = raw.split("\n").filter(Boolean);
  const parsed: TranscriptLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(TS_LINE);
    if (m) {
      const h = m[3] ? parseInt(m[1]!, 10) : 0;
      const min = m[3] ? parseInt(m[2]!, 10) : parseInt(m[1]!, 10);
      const sec = m[3] ? parseInt(m[3], 10) : parseInt(m[2]!, 10);
      const startSec = h * 3600 + min * 60 + sec;
      parsed.push({
        id: `tl-${i}`,
        startSec,
        endSec: startSec + 3,
        text: m[4]?.trim() ?? "",
      });
    } else if (parsed.length > 0) {
      const last = parsed[parsed.length - 1]!;
      last.text += " " + line.trim();
    } else {
      parsed.push({
        id: `tl-${i}`,
        startSec: 0,
        endSec: 5,
        text: line.trim(),
      });
    }
  }

  for (let i = 0; i < parsed.length; i++) {
    const next = parsed[i + 1];
    if (next) parsed[i]!.endSec = next.startSec;
    else parsed[i]!.endSec = parsed[i]!.startSec + 8;
  }

  return parsed.filter((l) => l.text.length > 0);
}

/** Plain text split into pseudo-lines for PDF/text materials */
export function parsePlainTranscript(raw: string): TranscriptLine[] {
  const sentences = raw
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  let offset = 0;
  return sentences.map((text, i) => {
    const line: TranscriptLine = {
      id: `tl-${i}`,
      startSec: i * 5,
      endSec: (i + 1) * 5,
      text,
    };
    offset += text.length;
    return line;
  });
}

export function parseTranscript(raw: string | null | undefined): TranscriptLine[] {
  if (!raw?.trim()) return [];
  if (raw.includes("[") && TS_LINE.test(raw.split("\n").find(Boolean) ?? "")) {
    return parseTimestampedTranscript(raw);
  }
  return parsePlainTranscript(raw);
}

export function findLineAtTime(
  lines: TranscriptLine[],
  timeSec: number,
): TranscriptLine | null {
  for (const line of lines) {
    if (timeSec >= line.startSec && timeSec < line.endSec) return line;
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    if (timeSec >= lines[i]!.startSec) return lines[i]!;
  }
  return lines[0] ?? null;
}

export function findLineForText(
  lines: TranscriptLine[],
  query: string,
): TranscriptLine | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let best: TranscriptLine | null = null;
  let bestScore = 0;

  for (const line of lines) {
    const text = line.text.toLowerCase();
    if (text.includes(q)) return line;
    const words = q.split(/\s+/).filter((w) => w.length > 1);
    const score = words.filter((w) => text.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }
  return best;
}
