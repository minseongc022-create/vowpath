/**
 * Generate demo audio — deep warm male US voice, one speaker, no overlap in mux.
 * Usage: npm run demo:tts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Naturally full American male — native voice, no artificial pitch-down. */
const EDGE_VOICE = "en-US-ChristopherNeural";
const EDGE_RATE = "+0%";
const EDGE_PITCH = "+0Hz";

const CLIPS = [
  // Restoration voice call — one question per turn
  {
    file: "voice-ai-0.mp3",
    text: "Hey, thanks for calling Ridgeline Restoration. What's going on?",
  },
  {
    file: "voice-ai-1.mp3",
    text: "I'm really glad you called. We'll take care of this. What's your name?",
  },
  {
    file: "voice-ai-2.mp3",
    text: "Thanks, Mike. What's the full property address — street, city, and state?",
  },
  {
    file: "voice-ai-3.mp3",
    text: "A sewage backup can move fast. I'm marking this urgent and texting the owner for approval now.",
  },
  {
    file: "voice-ai-4.mp3",
    text: "You're all set, Mike. Jake accepted the job and is heading your way. You'll get his ETA by text in just a moment.",
  },
  // Restoration overview
  {
    file: "overview-narr-0.mp3",
    text: "Effiroad answers the calls you miss at night, on weekends, or when you're already out in the field.",
  },
  {
    file: "overview-narr-1.mp3",
    text: "You keep your same phone number. Set the days and hours we answer, then forward unanswered calls.",
  },
  {
    file: "overview-narr-2.mp3",
    text: "We capture the caller's name, address, and problem. Then we decide whether it can move forward safely.",
  },
  {
    file: "overview-narr-3.mp3",
    text: `<speak>Clear P one water can page your crew. <break time="350ms"/> Fire, <break time="280ms"/> mold, <break time="280ms"/> or sewage with unclear details <break time="350ms"/> wait for your approval text.</speak>`,
  },
  {
    file: "overview-narr-4.mp3",
    text: "When the tech accepts, the customer gets an ETA. So the job moves, even when you could not answer live.",
  },
  // Link intake (restoration)
  {
    file: "link-narr-0.mp3",
    text: "If a caller cannot stay on the phone, Effiroad can send a text link instead.",
  },
  {
    file: "link-narr-1.mp3",
    text: `<speak>The link is for more than a contact form. <break time="300ms"/> It can capture an emergency booking, <break time="280ms"/> a free estimate request, <break time="280ms"/> or a callback time.</speak>`,
  },
  {
    file: "link-narr-2.mp3",
    text: "They choose the purpose. Then they enter name, address, issue, photos if needed, and the best time to follow up.",
  },
  {
    file: "link-narr-3.mp3",
    text: "When they submit, the job is saved to your dashboard and the owner gets a notification.",
  },
  {
    file: "link-narr-4.mp3",
    text: "From there, you can approve dispatch, schedule the visit, or call back with the full context already captured.",
  },
  // HVAC no-heat voice call — one question per turn
  {
    file: "voice-hvac-0.mp3",
    text: "Comfort Air HVAC, thanks for calling. What's going on at the house?",
  },
  {
    file: "voice-hvac-1.mp3",
    text: "I'm sorry you're dealing with that, especially this early. Quick safety check — do you smell gas or hear any sparking?",
  },
  {
    file: "voice-hvac-2.mp3",
    text: "Good. No gas smell. What's your name?",
  },
  {
    file: "voice-hvac-3.mp3",
    text: "Thanks, Sarah. What's the full service address?",
  },
  {
    file: "voice-hvac-4.mp3",
    text: "Got it. That's a verified no-heat call, so I'm dispatching your on-call tech now. You'll get an ETA text shortly.",
  },
  // HVAC gas smell hold
  {
    file: "voice-hvac-gas-0.mp3",
    text: "Comfort Air HVAC, you've reached us. Tell me what's happening — and whether anyone feels sick.",
  },
  {
    file: "voice-hvac-gas-1.mp3",
    text: "I hear you. Gas smell is serious, so I'm not sending anyone blindly. What's your name?",
  },
  {
    file: "voice-hvac-gas-2.mp3",
    text: "Thank you. What's the full property address?",
  },
  {
    file: "voice-hvac-gas-3.mp3",
    text: "Got it. I'm holding this as a safety call and texting the owner now, so they can decide the safest next step.",
  },
  // HVAC overview
  {
    file: "overview-hvac-narr-0.mp3",
    text: "Effiroad answers HVAC calls when you're on another job, after hours, or covering a weekend schedule.",
  },
  {
    file: "overview-hvac-narr-1.mp3",
    text: "You keep your main number. Set when we answer, then forward missed calls so customers never reach voicemail.",
  },
  {
    file: "overview-hvac-narr-2.mp3",
    text: "For clear no-heat or no-cool calls, we collect the details and text your on-call tech right away.",
  },
  {
    file: "overview-hvac-narr-3.mp3",
    text: `<speak>But gas smell, <break time="280ms"/> sparking, <break time="280ms"/> or fuzzy details <break time="350ms"/> do not auto-dispatch. You get a hold text: reply one to send a tech, two to hold.</speak>`,
  },
  {
    file: "overview-hvac-narr-4.mp3",
    text: "When a tech accepts, the customer gets an ETA. Effiroad answers, triages, and dispatches without taking control away from you.",
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
      speed: 1.0,
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
