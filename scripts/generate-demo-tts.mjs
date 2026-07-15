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

const CLIPS = [
  { file: "voice-ai-0.mp3", text: "Hi there, thanks for calling Ridgeline Restoration! I can help right now — what's going on?" },
  { file: "voice-ai-1.mp3", text: "I'm really glad you called — we're gonna take care of this. Can I get your name and the address?" },
  { file: "voice-ai-2.mp3", text: "Got it, Mike. Sounds like a sewage backup — I'm flagging this urgent and alerting the team now." },
  { file: "voice-ai-3.mp3", text: "You're in good hands, Mike — a tech is on the way. You'll get a text with their ETA shortly." },
  { file: "overview-narr-0.mp3", text: "Effiroad answers emergency calls for restoration and HVAC shops — twenty-four seven." },
  { file: "overview-narr-1.mp3", text: "Keep your same phone number. Forward unanswered calls to Effiroad." },
  { file: "overview-narr-2.mp3", text: "AI picks up every time — voice intake, or press two for a text link." },
  { file: "overview-narr-3.mp3", text: "We capture the address, loss type, and urgency. P1 water can auto-dispatch your crew." },
  { file: "overview-narr-4.mp3", text: "Fire, mold, or unclear jobs? You get a text to approve before anyone rolls." },
  { file: "link-narr-0.mp3", text: "A customer calls your shop late at night." },
  { file: "link-narr-1.mp3", text: "They press two to get a self-service link by text." },
  { file: "link-narr-2.mp3", text: "An SMS arrives with a one-minute form — no phone tag needed." },
  { file: "link-narr-3.mp3", text: "They fill in their name, address, and the issue on their phone." },
  { file: "link-narr-4.mp3", text: "Done — you get notified and the job is captured." },
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

  for (const clip of CLIPS) {
    const mp3 = path.join(outDir, clip.file);
    if (useOpenAi) {
      const buf = await openAiTts(clip.text, key);
      await writeFile(mp3, buf);
    } else {
      await edgeTts(clip.text, mp3);
    }
    console.log("Wrote", mp3);
  }

  console.log("Done —", CLIPS.length, "demo audio clips");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
