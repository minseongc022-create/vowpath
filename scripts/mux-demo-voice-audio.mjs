/**
 * Mux AI voice audio into demo-voice.mp4 (Playwright video has no audio track).
 * Usage: node scripts/mux-demo-voice-audio.mjs
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoPath = path.join(root, "public", "videos", "demo-voice.mp4");
const audioDir = path.join(root, "public", "demo-audio");
const tmpAudio = path.join(root, "public", "videos", "_voice-mix.mp3");
const outPath = path.join(root, "public", "videos", "demo-voice-audio.mp4");

/** Matches PHONE_DEMO_TIMELINE ai-voice start times (ms) in DemoAiPhoneScene.run() */
const AI_START_MS = [1900, 6300, 10300, 14900];

function ffprobeDuration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { encoding: "utf8" },
  ).trim();
  return parseFloat(out);
}

function main() {
  if (!existsSync(videoPath)) {
    console.error("Missing", videoPath, "— run npm run demo:record first");
    process.exit(1);
  }

  for (let i = 0; i < 4; i++) {
    const mp3 = path.join(audioDir, `voice-ai-${i}.mp3`);
    if (!existsSync(mp3)) {
      console.error("Missing", mp3, "— run npm run demo:tts first");
      process.exit(1);
    }
  }

  const videoDur = ffprobeDuration(videoPath);
  const delays = AI_START_MS.map(
    (ms, i) => `[${i + 1}:a]adelay=${ms}|${ms},aresample=44100,volume=1.15[a${i}]`,
  ).join(";");
  const mixLabels = AI_START_MS.map((_, i) => `[a${i}]`).join("");
  const filter = `[0:a]aresample=44100[sil];${delays};${mixLabels}[sil]amix=inputs=${AI_START_MS.length + 1}:duration=longest:dropout_transition=0[out]`;

  const inputArgs = [
    `-f lavfi -t ${videoDur.toFixed(2)} -i anullsrc=r=44100:cl=mono`,
    ...AI_START_MS.map((_, i) => `-i "${path.join(audioDir, `voice-ai-${i}.mp3`)}"`),
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

  console.log("[mux] Updated", videoPath, `(${videoDur.toFixed(1)}s + AI voice)`);
}

main();
