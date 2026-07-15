/**
 * Generate demo audio — warm male US voice, one speaker, no overlap in mux.
 * Usage: npm run demo:tts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Warm American male — caring dispatcher tone (Edge TTS). */
const EDGE_VOICE = "en-US-GuyNeural";
const EDGE_RATE = "-4%";
const EDGE_PITCH = "+2Hz";

const CLIPS = [
  {
    file: "voice-ai-0.mp3",
    text: "Hey there — thanks so much for calling Ridgeline Restoration! I'm right here with you... what's going on?",
  },
  {
    file: "voice-ai-1.mp3",
    text: "Oh, I'm really glad you called, okay? We're gonna take care of this together. Can I get your name and the address for me?",
  },
  {
    file: "voice-ai-2.mp3",
    text: "Got it, Mike — okay, that sounds like a sewage backup. I'm flagging this urgent and getting your team alerted right now, alright?",
  },
  {
    file: "voice-ai-3.mp3",
    text: "You're in good hands, Mike — I promise. A tech is on the way, and you'll get a text with their ETA in just a minute, okay?",
  },
  {
    file: "overview-narr-0.mp3",
    text: "Effiroad answers emergency calls for restoration and HVAC shops — twenty-four seven.",
  },
  {
    file: "overview-narr-1.mp3",
    text: "Keep your same phone number. Just forward unanswered calls to Effiroad.",
  },
  {
    file: "overview-narr-2.mp3",
    text: "AI picks up every time — voice intake, or press two for a quick text link.",
  },
  {
    file: "overview-narr-3.mp3",
    text: "We capture the address, loss type, and urgency. P one water can auto-dispatch your crew.",
  },
  {
    file: "overview-narr-4.mp3",
    text: "Fire, mold, or unclear jobs? You get a text to approve before anyone rolls.",
  },
  {
    file: "link-narr-0.mp3",
    text: "A customer calls your shop late at night.",
  },
  {
    file: "link-narr-1.mp3",
    text: "They press two to get a self-service link by text.",
  },
  {
    file: "link-narr-2.mp3",
    text: "An SMS arrives with a one-minute form — no phone tag needed.",
  },
  {
    file: "link-narr-3.mp3",
    text: "They fill in their name, address, and the issue on their phone.",
  },
  {
    file: "link-narr-4.mp3",
    text: "Done — you get notified and the job is captured.",
  },
];

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "demo-audio");

async function openAiTts(text, key) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      voice: "onyx",
      input: text,
      speed: 0.95,
    }),
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
    c = edge_tts.Communicate(${JSON.stringify(text)}, ${JSON.stringify(EDGE_VOICE)}, rate=${JSON.stringify(EDGE_RATE)}, pitch=${JSON.stringify(EDGE_PITCH)})
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
  console.log(
    useOpenAi
      ? "[demo:tts] OpenAI onyx (warm male)"
      : `[demo:tts] Edge TTS ${EDGE_VOICE} (${EDGE_RATE}, ${EDGE_PITCH})`,
  );

  for (const clip of CLIPS) {
    const mp3 = path.join(outDir, clip.file);
    if (useOpenAi) {
      await writeFile(mp3, await openAiTts(clip.text, key));
    } else {
      await edgeTts(clip.text, mp3);
    }
    console.log("Wrote", mp3);
  }

  console.log("Done —", CLIPS.length, "clips (single male voice)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
