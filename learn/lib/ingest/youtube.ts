import { YoutubeTranscript } from "youtube-transcript";
import type { TranscriptSegment } from "@/learn/lib/ingest/chunker";

export function extractYouTubeVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return url.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = url.searchParams.get("v");
      if (v) return v;
      const embed = url.pathname.match(/\/embed\/([\w-]{11})/);
      if (embed) return embed[1];
      const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/);
      if (shorts) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchYouTubeTranscript(
  videoId: string,
  lang = "ko",
): Promise<TranscriptSegment[]> {
  const langs = [lang, "ko", "en", "en-US", "en-GB"];
  let lastError: unknown;

  for (const code of langs) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: code });
      if (items.length > 0) {
        return items.map((item) => ({
          text: item.text,
          startSec: item.offset / 1000,
          durationSec: item.duration / 1000,
        }));
      }
    } catch (e) {
      lastError = e;
    }
  }

  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items.length > 0) {
      return items.map((item) => ({
        text: item.text,
        startSec: item.offset / 1000,
        durationSec: item.duration / 1000,
      }));
    }
  } catch (e) {
    lastError = e;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("YOUTUBE_TRANSCRIPT_UNAVAILABLE");
}

export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return data.title ?? null;
  } catch {
    return null;
  }
}
