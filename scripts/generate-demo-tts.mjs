/**
 * Generate AI voice audio for landing demo videos.
 * Tries OpenAI TTS first, then Microsoft Edge TTS (free, no key).
 *
 * Usage: npm run demo:tts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VOICE_DEMO_AI_LINES = [
  "Hi there, thanks for calling Ridgeline Restoration! I can help right now — what's going on?",
  "I'm really glad you called — we're gonna take care of this. Can I get your name and the address?",
  "Got it, Mike. Sounds like a sewage backup — I'm flagging this urgent and alerting the team now.",
  "You're in good hands, Mike — a tech is on the way. You'll get a text with their ETA shortly.",
];

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "demo-audio");
const EDGE_VOICE = "en-US-JennyNeural";

async function openAiTts(text, key) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "tts-1", voice: "nova", input: text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return Buffer.from(await res.arrayBuffer());
}

function edgeTts(text, outPath) {
  return new Promise((resolve, reject) => {
    const py = spawn(
      "python3",
      [
        "-c",
        `import asyncio, edge_tts
async def main():
    c = edge_tts.Communicate(${JSON.stringify(text)}, ${JSON.stringify(EDGE_VOICE)})
    await c.save(${JSON.stringify(outPath)})
asyncio.run(main())`,
      ],
      { stdio: "inherit" },
    );
    py.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`edge-tts exit ${code}`))));
    py.on("error", reject);
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const key = process.env.OPENAI_API_KEY?.trim();
  const useOpenAi = key?.startsWith("sk-");
  if (!useOpenAi) {
    console.log("[demo:tts] OPENAI_API_KEY not set — using Edge TTS (JennyNeural)");
  }

  for (let i = 0; i < VOICE_DEMO_AI_LINES.length; i++) {
    const text = VOICE_DEMO_AI_LINES[i];
    const mp3 = path.join(outDir, `voice-ai-${i}.mp3`);
    if (useOpenAi) {
      const buf = await openAiTts(text, key);
      await writeFile(mp3, buf);
    } else {
      await edgeTts(text, mp3);
    }
    console.log("Wrote", mp3);
  }

  console.log("Done —", VOICE_DEMO_AI_LINES.length, "AI voice clips");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
