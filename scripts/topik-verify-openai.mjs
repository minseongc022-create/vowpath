import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const key =
  process.env.LEARN_OPENAI_API_KEY?.trim() ||
  process.env.OPENAI_API_KEY?.trim();

if (!key?.startsWith("sk-")) {
  console.error("❌ OPENAI_API_KEY not set. Add to .env.local or Vercel env.");
  process.exit(1);
}

const writingModel = process.env.TOPIK_OPENAI_MODEL_WRITING ?? "gpt-4o";
const speakingModel = process.env.TOPIK_OPENAI_MODEL_SPEAKING ?? "gpt-4o-mini";

console.log("Checking OpenAI for TOPIK Master VN…");
console.log(`  Writing model: ${writingModel}`);
console.log(`  Speaking model: ${speakingModel}`);

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: speakingModel,
    messages: [{ role: "user", content: 'Reply JSON only: {"ok":true}' }],
    response_format: { type: "json_object" },
    max_tokens: 20,
  }),
});

if (!res.ok) {
  console.error(`❌ OpenAI API error: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log("✅ OpenAI API key valid — TOPIK writing/speaking/Whisper ready.");
console.log("   Run: npm run dev → http://localhost:3000/topik");
