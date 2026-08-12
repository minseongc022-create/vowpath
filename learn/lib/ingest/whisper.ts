import ytdl from "@distube/ytdl-core";
import type { TranscriptSegment } from "@/learn/lib/ingest/chunker";

const WHISPER_MAX_BYTES = 24 * 1024 * 1024;
const SEGMENT_DURATION_SEC = 600;

type WhisperVerbose = {
  text: string;
  segments?: { start: number; end: number; text: string }[];
};

type YtdlOptions = {
  quality: string;
  filter: string;
  range?: { start?: number; end?: number };
};

/** Whisper fallback when YouTube captions are unavailable. */
export async function transcribeYouTubeWithWhisper(
  videoId: string,
): Promise<TranscriptSegment[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  if (!ytdl.validateURL(url)) {
    throw new Error("INVALID_YOUTUBE_URL");
  }

  const info = await ytdl.getInfo(url);
  const durationSec = Number(info.videoDetails.lengthSeconds) || 0;
  const title = info.videoDetails.title;

  const allSegments: TranscriptSegment[] = [];

  if (durationSec <= SEGMENT_DURATION_SEC) {
    const buffer = await downloadAudioBuffer(url);
    const result = await callWhisper(buffer, `${videoId}.webm`, apiKey);
    return whisperToSegments(result, 0);
  }

  // Long video: process in 10-minute segments
  const segmentCount = Math.ceil(durationSec / SEGMENT_DURATION_SEC);

  for (let i = 0; i < segmentCount; i++) {
    const startSec = i * SEGMENT_DURATION_SEC;
    const endSec = Math.min((i + 1) * SEGMENT_DURATION_SEC, durationSec);

    const buffer = await downloadAudioBuffer(url, startSec, endSec);
    if (buffer.length < 1000) continue;

    const result = await callWhisper(
      buffer,
      `${videoId}-${i}.webm`,
      apiKey,
    );
    const segs = whisperToSegments(result, startSec);
    allSegments.push(...segs);
  }

  if (allSegments.length === 0) {
    throw new Error("WHISPER_EMPTY");
  }

  return allSegments;
}

async function downloadAudioBuffer(
  url: string,
  beginSec = 0,
  endSec?: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    const options: YtdlOptions = {
      quality: "lowestaudio",
      filter: "audioonly",
    };

    if (beginSec > 0 || endSec !== undefined) {
      options.range = {
        start: beginSec * 1000,
        ...(endSec !== undefined ? { end: endSec * 1000 } : {}),
      };
    }

    const stream = ytdl(url, options as Parameters<typeof ytdl>[1]);

    stream.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > WHISPER_MAX_BYTES) {
        stream.destroy();
        resolve(Buffer.concat(chunks));
        return;
      }
      chunks.push(chunk);
    });

    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    setTimeout(() => {
      stream.destroy();
      reject(new Error("YOUTUBE_AUDIO_TIMEOUT"));
    }, 120_000);
  });
}

async function callWhisper(
  buffer: Buffer,
  filename: string,
  apiKey: string,
): Promise<WhisperVerbose> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: "audio/webm" }),
    filename,
  );
  form.append("model", process.env.OPENAI_WHISPER_MODEL ?? "whisper-1");
  form.append("language", "ko");
  form.append("response_format", "verbose_json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("OPENAI_INVALID_KEY");
    throw new Error(`WHISPER_FAILED_${res.status}`);
  }

  return (await res.json()) as WhisperVerbose;
}

function whisperToSegments(
  result: WhisperVerbose,
  offsetSec: number,
): TranscriptSegment[] {
  if (result.segments?.length) {
    return result.segments.map((s) => ({
      text: s.text.trim(),
      startSec: s.start + offsetSec,
      durationSec: Math.max(0.1, s.end - s.start),
    }));
  }

  if (result.text?.trim()) {
    return [
      {
        text: result.text.trim(),
        startSec: offsetSec,
        durationSec: 1,
      },
    ];
  }

  return [];
}

export async function getYouTubeDuration(videoId: string): Promise<number> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const info = await ytdl.getInfo(url);
  return Number(info.videoDetails.lengthSeconds) || 0;
}

export { type TranscriptSegment };
