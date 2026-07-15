/**
 * Generate demo audio — deep warm male US voice, one speaker, no overlap in mux.
 * Usage: npm run demo:tts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Deep American male — warm cave tone, not exaggerated (Edge TTS). */
const EDGE_VOICE = "en-US-GuyNeural";
const EDGE_RATE = "-5%";
const EDGE_PITCH = "-8Hz";

const CLIPS = [
  // Restoration voice call
  {
    file: "voice-ai-0.mp3",
    text: "Hey — thanks for calling Ridgeline Restoration. You've got me. What's going on over there?",
  },
  {
    file: "voice-ai-1.mp3",
    text: "I'm really glad you called. We'll take care of this. What's your name, and what's the address?",
  },
  {
    file: "voice-ai-2.mp3",
    text: "Got it, Mike. Sounds like a sewage backup — I'm marking this urgent and paging the crew right now.",
  },
  {
    file: "voice-ai-3.mp3",
    text: "You're all set, Mike. Someone's already heading your way. You'll get a text with their ETA in just a minute.",
  },
  // Restoration overview
  {
    file: "overview-narr-0.mp3",
    text: "Effiroad catches the calls you miss — nights, weekends, and when you're on a job.",
  },
  {
    file: "overview-narr-1.mp3",
    text: "Keep your same number. Set when Effiroad answers, then forward unanswered calls.",
  },
  {
    file: "overview-narr-2.mp3",
    text: "AI voice intake, or press two for a quick text link — address and loss type either way.",
  },
  {
    file: "overview-narr-3.mp3",
    text: "Clear P one water can auto-dispatch your crew. Fire, mold, or unclear jobs wait for your text.",
  },
  {
    file: "overview-narr-4.mp3",
    text: "Reply one to dispatch, two to hold — you're always in control.",
  },
  // Link intake (restoration)
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
  // HVAC no-heat voice call
  {
    file: "voice-hvac-0.mp3",
    text: "Comfort Air HVAC — thanks for calling. Who am I speaking with, and what's going on at the house?",
  },
  {
    file: "voice-hvac-1.mp3",
    text: "I'm sorry you're dealing with that. Quick safety check — do you smell gas or hear any sparking?",
  },
  {
    file: "voice-hvac-2.mp3",
    text: "Good — no gas smell. What's the address, and about how cold is it inside right now?",
  },
  {
    file: "voice-hvac-3.mp3",
    text: "Got it, Sarah. No-heat verified — I'm dispatching your on-call tech now. You'll get a text with ETA shortly.",
  },
  // HVAC gas smell hold
  {
    file: "voice-hvac-gas-0.mp3",
    text: "Comfort Air HVAC — you've reached us. Tell me what's happening and if anyone is feeling sick.",
  },
  {
    file: "voice-hvac-gas-1.mp3",
    text: "I hear you — gas smell is serious. I'm not sending anyone until the owner approves. Name and address?",
  },
  {
    file: "voice-hvac-gas-2.mp3",
    text: "Thank you. I'm holding this as a safety call and texting the owner now — they'll decide next steps.",
  },
  // HVAC overview
  {
    file: "overview-hvac-narr-0.mp3",
    text: "Saturday six A M on an install? Effiroad picks up the calls you can't — on the schedule you set.",
  },
  {
    file: "overview-hvac-narr-1.mp3",
    text: "Forward unanswered calls from your main line. Customers never see a new number.",
  },
  {
    file: "overview-hvac-narr-2.mp3",
    text: "Verified no-heat or no-cool with a clear address? Your on-call tech gets an SMS instantly.",
  },
  {
    file: "overview-hvac-narr-3.mp3",
    text: "Gas smell, sparking, or fuzzy details? Owner gets a hold text — reply one to dispatch, two to hold.",
  },
  {
    file: "overview-hvac-narr-4.mp3",
    text: "Tech replies one to accept. Customer gets an on-the-way text. You stay in control.",
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
      speed: 0.9,
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
      ? "[demo:tts] OpenAI onyx (deep male)"
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

  console.log("Done —", CLIPS.length, "clips (single deep male voice)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
