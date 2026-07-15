/**
 * Mux demo audio — one voice at a time, never overlapping.
 * Usage: node scripts/mux-demo-audio.mjs [overview|voice|link-intake|all|hvac-all]
 */
import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoDir = path.join(root, "public", "videos");
const audioDir = path.join(root, "public", "demo-audio");

/** Narration gap: enough room for the screen to breathe before the next sentence. */
const GAP_MS = 950;

const DEMOS = {
  overview: {
    video: "demo-overview.mp4",
    files: [
      "overview-narr-0.mp3",
      "overview-narr-1.mp3",
      "overview-narr-2.mp3",
      "overview-narr-3.mp3",
      "overview-narr-4.mp3",
    ],
    startOffsetMs: 700,
  },
  "overview-hvac": {
    video: "demo-overview-hvac.mp4",
    files: [
      "overview-hvac-narr-0.mp3",
      "overview-hvac-narr-1.mp3",
      "overview-hvac-narr-2.mp3",
      "overview-hvac-narr-3.mp3",
      "overview-hvac-narr-4.mp3",
    ],
    startOffsetMs: 700,
  },
  voice: {
    video: "demo-voice.mp4",
    files: ["voice-ai-0.mp3", "voice-ai-1.mp3", "voice-ai-2.mp3", "voice-ai-3.mp3"],
    startOffsetMs: 2200,
    gapsAfterClipMs: [6300, 6400, 6750],
    volume: 1.1,
  },
  "voice-hvac": {
    video: "demo-voice-hvac.mp4",
    files: ["voice-hvac-0.mp3", "voice-hvac-1.mp3", "voice-hvac-2.mp3", "voice-hvac-3.mp3"],
    startOffsetMs: 2200,
    gapsAfterClipMs: [6300, 6200, 6300],
    volume: 1.1,
  },
  "risk-hold-hvac": {
    video: "demo-risk-hold-hvac.mp4",
    files: ["voice-hvac-gas-0.mp3", "voice-hvac-gas-1.mp3", "voice-hvac-gas-2.mp3"],
    startOffsetMs: 2200,
    gapsAfterClipMs: [6300, 6400],
    volume: 1.1,
  },
  "link-intake": {
    video: "demo-link-intake.mp4",
    files: [
      "link-narr-0.mp3",
      "link-narr-1.mp3",
      "link-narr-2.mp3",
      "link-narr-3.mp3",
      "link-narr-4.mp3",
    ],
    startOffsetMs: 700,
  },
};

function ffprobeDuration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" },
  ).trim();
  return parseFloat(out);
}

function scheduleSequential(files, startOffsetMs, gapMs) {
  let cursor = startOffsetMs;
  return files.map((file) => {
    const mp3 = path.join(audioDir, file);
    const startMs = Math.round(cursor);
    const durMs = ffprobeDuration(mp3) * 1000;
    cursor = startMs + durMs + gapMs;
    return { file, startMs };
  });
}

function scheduleAnchored(files, anchorMs, gapMs) {
  let cursor = 0;
  return files.map((file, i) => {
    const mp3 = path.join(audioDir, file);
    const minStart = anchorMs[i] ?? cursor;
    const startMs = Math.round(Math.max(minStart, cursor));
    const durMs = ffprobeDuration(mp3) * 1000;
    cursor = startMs + durMs + gapMs;
    return { file, startMs };
  });
}

function scheduleWithClipGaps(files, startOffsetMs, gapsAfterClipMs) {
  let cursor = startOffsetMs;
  return files.map((file, i) => {
    const mp3 = path.join(audioDir, file);
    const startMs = Math.round(cursor);
    const durMs = ffprobeDuration(mp3) * 1000;
    cursor = startMs + durMs + (gapsAfterClipMs[i] ?? GAP_MS);
    return { file, startMs };
  });
}

function muxDemo(id) {
  const cfg = DEMOS[id];
  const videoPath = path.join(videoDir, cfg.video);
  const tmpAudio = path.join(videoDir, `_${id}-mix.mp3`);
  const outPath = path.join(videoDir, `_${id}-out.mp4`);

  if (!existsSync(videoPath)) {
    console.warn(`[mux] Skip ${id} — missing ${videoPath}`);
    return;
  }

  for (const file of cfg.files) {
    const mp3 = path.join(audioDir, file);
    if (!existsSync(mp3)) {
      console.error(`[mux] Missing ${mp3} — run npm run demo:tts first`);
      process.exit(1);
    }
  }

  const clips = cfg.gapsAfterClipMs
    ? scheduleWithClipGaps(cfg.files, cfg.startOffsetMs ?? 0, cfg.gapsAfterClipMs)
    : cfg.anchorMs
      ? scheduleAnchored(cfg.files, cfg.anchorMs, GAP_MS)
      : scheduleSequential(cfg.files, cfg.startOffsetMs ?? 0, GAP_MS);

  const videoDur = ffprobeDuration(videoPath);
  const vol = cfg.volume ?? 1;

  const delays = clips.map(
    (clip, i) =>
      `[${i + 1}:a]adelay=${clip.startMs}|${clip.startMs},aresample=44100,volume=${vol}[a${i}]`,
  );
  const mixLabels = clips.map((_, i) => `[a${i}]`).join("");
  const filter = `[0:a]aresample=44100[sil];${delays.join(";")};${mixLabels}[sil]amix=inputs=${clips.length + 1}:duration=longest:dropout_transition=0[out]`;

  const inputArgs = [
    `-f lavfi -t ${videoDur.toFixed(2)} -i anullsrc=r=44100:cl=mono`,
    ...clips.map((clip) => `-i "${path.join(audioDir, clip.file)}"`),
  ].join(" ");

  execSync(
    `ffmpeg -y ${inputArgs} -filter_complex "${filter}" -map "[out]" -q:a 2 "${tmpAudio}"`,
    { stdio: "inherit" },
  );

  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${tmpAudio}" -c:v copy -c:a aac -b:a 128k -shortest "${outPath}"`,
    { stdio: "inherit" },
  );

  execSync(`mv "${outPath}" "${videoPath}"`, { stdio: "inherit" });
  try {
    unlinkSync(tmpAudio);
  } catch {
    /* ignore */
  }

  console.log(
    `[mux] ${id}: ${clips.length} clips sequential —`,
    clips.map((c) => `${c.file}@${c.startMs}ms`).join(", "),
  );
}

const target = process.argv[2] ?? "all";
const allIds = Object.keys(DEMOS);
const hvacIds = ["overview-hvac", "voice-hvac", "risk-hold-hvac"];
const restorationIds = ["overview", "voice", "link-intake"];

let ids;
if (target === "all") ids = allIds;
else if (target === "hvac-all") ids = hvacIds;
else if (target === "restoration-all") ids = restorationIds;
else ids = [target];

for (const id of ids) {
  if (!DEMOS[id]) {
    console.error(`Unknown demo: ${id}`);
    process.exit(1);
  }
  muxDemo(id);
}
