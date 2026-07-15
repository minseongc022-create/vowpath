/**
 * Mux timed narration / voice clips into landing demo MP4s.
 * Usage: node scripts/mux-demo-audio.mjs [overview|voice|link-intake|all]
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoDir = path.join(root, "public", "videos");
const audioDir = path.join(root, "public", "demo-audio");

const DEMOS = {
  overview: {
    video: "demo-overview.mp4",
    clips: [
      { file: "overview-narr-0.mp3", startMs: 600 },
      { file: "overview-narr-1.mp3", startMs: 2000 },
      { file: "overview-narr-2.mp3", startMs: 4800 },
      { file: "overview-narr-3.mp3", startMs: 7600 },
      { file: "overview-narr-4.mp3", startMs: 10400 },
    ],
  },
  voice: {
    video: "demo-voice.mp4",
    clips: [
      { file: "voice-ai-0.mp3", startMs: 1900 },
      { file: "voice-ai-1.mp3", startMs: 6300 },
      { file: "voice-ai-2.mp3", startMs: 10300 },
      { file: "voice-ai-3.mp3", startMs: 14900 },
    ],
    volume: 1.15,
  },
  "link-intake": {
    video: "demo-link-intake.mp4",
    clips: [
      { file: "link-narr-0.mp3", startMs: 600 },
      { file: "link-narr-1.mp3", startMs: 2000 },
      { file: "link-narr-2.mp3", startMs: 4200 },
      { file: "link-narr-3.mp3", startMs: 6800 },
      { file: "link-narr-4.mp3", startMs: 10600 },
    ],
  },
};

function ffprobeDuration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" },
  ).trim();
  return parseFloat(out);
}

function muxDemo(id) {
  const cfg = DEMOS[id];
  const videoPath = path.join(videoDir, cfg.video);
  const tmpAudio = path.join(videoDir, `_${id}-mix.mp3`);
  const outPath = path.join(videoDir, `_${id}-out.mp4`);

  if (!existsSync(videoPath)) {
    console.error(`[mux] Missing ${videoPath}`);
    process.exit(1);
  }

  for (const clip of cfg.clips) {
    const mp3 = path.join(audioDir, clip.file);
    if (!existsSync(mp3)) {
      console.error(`[mux] Missing ${mp3} — run npm run demo:tts first`);
      process.exit(1);
    }
  }

  const videoDur = ffprobeDuration(videoPath);
  const vol = cfg.volume ?? 1;
  const delays = cfg.clips.map(
    (clip, i) =>
      `[${i + 1}:a]adelay=${clip.startMs}|${clip.startMs},aresample=44100,volume=${vol}[a${i}]`,
  );
  const mixLabels = cfg.clips.map((_, i) => `[a${i}]`).join("");
  const filter = `[0:a]aresample=44100[sil];${delays.join(";")};${mixLabels}[sil]amix=inputs=${cfg.clips.length + 1}:duration=longest:dropout_transition=0[out]`;

  const inputArgs = [
    `-f lavfi -t ${videoDur.toFixed(2)} -i anullsrc=r=44100:cl=mono`,
    ...cfg.clips.map((clip) => `-i "${path.join(audioDir, clip.file)}"`),
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
  execSync(`rm -f "${tmpAudio}"`, { stdio: "inherit" });

  console.log(`[mux] Updated ${videoPath} (${videoDur.toFixed(1)}s + ${cfg.clips.length} clips)`);
}

const target = process.argv[2] ?? "all";
const ids = target === "all" ? Object.keys(DEMOS) : [target];
for (const id of ids) {
  if (!DEMOS[id]) {
    console.error(`Unknown demo: ${id}`);
    process.exit(1);
  }
  muxDemo(id);
}
