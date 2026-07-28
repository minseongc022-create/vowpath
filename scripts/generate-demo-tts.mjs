/**
 * Generate demo audio — matches live Retell telephony voice (deep US male, deliberate pace).
 * Usage: npm run demo:tts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_EDGE_PITCH,
  DEMO_EDGE_RATE,
  DEMO_EDGE_VOICE,
  DEMO_OPENAI_VOICE,
  DEMO_VOICE_SPEED,
} from "./lib/demo-voice-settings.mjs";

const CLIPS = [
  // Restoration — Twilio menu + Retell phone intake
  {
    file: "voice-ai-main.mp3",
    text: "Thank you for calling Ridgeline Restoration. To book service or report an emergency, say service or press 1. For a free estimate, say estimate or press 2.",
  },
  {
    file: "voice-ai-channel.mp3",
    text: "Hi — thanks for calling Ridgeline Restoration. Would you like to continue on the phone, or by text with a quick link? Just say phone or text — you can also press 2 for phone, or press 1 for text.",
  },
  {
    file: "voice-ai-0.mp3",
    text: "Thanks for calling. I'm right here with you — what's your name?",
  },
  {
    file: "voice-ai-1.mp3",
    text: "What's the full street address for the visit?",
  },
  {
    file: "voice-ai-2.mp3",
    text: "Got it — 4821 Oak Drive in Austin. Just to confirm — Mike Wilson, 4821 Oak Drive, Austin, sewage backup in the basement. Is that right?",
  },
  {
    file: "voice-ai-3.mp3",
    text: "You're all set — I'll text you a secure link to confirm that address and pick your visit time. Our team's on it.",
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
    text: "When the tech texts departing, the customer gets a live map. So the job moves, even when you could not answer live.",
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
  // HVAC
  {
    file: "voice-hvac-main.mp3",
    text: "Thank you for calling Comfort Air HVAC. To book service or report an emergency, say service or press 1. For a free estimate, say estimate or press 2.",
  },
  {
    file: "voice-hvac-channel.mp3",
    text: "Hi — thanks for calling Comfort Air HVAC. Would you like to continue on the phone, or by text with a quick link? Just say phone or text — you can also press 2 for phone, or press 1 for text.",
  },
  {
    file: "voice-hvac-0.mp3",
    text: "Comfort Air HVAC, thanks for calling. I'm right here with you — what's your name?",
  },
  {
    file: "voice-hvac-1.mp3",
    text: "Quick safety check — do you smell gas or hear any sparking?",
  },
  {
    file: "voice-hvac-2.mp3",
    text: "Good — no gas smell. What's the full street address for the visit?",
  },
  {
    file: "voice-hvac-3.mp3",
    text: "Got it — 910 Cedar Lane. Just to confirm — Sarah Bennett, 910 Cedar Lane, no heat, kids home, no gas smell. Is that right?",
  },
  {
    file: "voice-hvac-4.mp3",
    text: "You're all set — I'll text you a secure link to confirm that address and pick your visit time. Our team's on it.",
  },
  // HVAC gas smell hold
  {
    file: "voice-hvac-gas-0.mp3",
    text: "Comfort Air HVAC, you've reached us. I'm right here with you — tell me what's happening, and whether anyone feels sick.",
  },
  {
    file: "voice-hvac-gas-1.mp3",
    text: "I hear you. Gas smell is serious, so I'm not sending anyone blindly. What's your name?",
  },
  {
    file: "voice-hvac-gas-2.mp3",
    text: "Got it. I'm holding this as a safety call and texting the owner now — they'll confirm next steps. You'll also get a secure link for the address.",
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
    text: "When a tech texts departing, the customer gets a live map. Effiroad answers, triages, and dispatches without taking control away from you.",
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
      voice: DEMO_OPENAI_VOICE,
      input: text,
      speed: DEMO_VOICE_SPEED,
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
    c = edge_tts.Communicate(${JSON.stringify(text)}, ${JSON.stringify(DEMO_EDGE_VOICE)}, rate=${JSON.stringify(DEMO_EDGE_RATE)}, pitch=${JSON.stringify(DEMO_EDGE_PITCH)})
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
      ? `[demo:tts] OpenAI ${DEMO_OPENAI_VOICE} @ ${DEMO_VOICE_SPEED}x`
      : `[demo:tts] Edge TTS ${DEMO_EDGE_VOICE} (${DEMO_EDGE_RATE}, ${DEMO_EDGE_PITCH})`,
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
