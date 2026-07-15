/**
 * Record Effiroad demo videos for landing pages (restoration + HVAC verticals).
 * Usage: npm run demo:record
 * Optional: DEMO_VERTICAL=hvac|restoration|all (default all)
 */
import { spawn } from "node:child_process";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "videos");
let BASE = process.env.DEMO_RECORD_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const VIEWPORT = { width: 1280, height: 720 };

const RESTORATION_SCENES = [
  { slug: "overview", query: "", out: "demo-overview.webm", waitMs: 18_000, stripAudio: true },
  { slug: "voice", query: "", out: "demo-voice.webm", waitMs: 54_000, stripAudio: false },
  { slug: "link-intake", query: "", out: "demo-link-intake.webm", waitMs: 16_000, stripAudio: true },
];

const HVAC_SCENES = [
  { slug: "overview", query: "?vertical=hvac", out: "demo-overview-hvac.webm", waitMs: 18_000, stripAudio: true },
  { slug: "voice", query: "?vertical=hvac", out: "demo-voice-hvac.webm", waitMs: 36_000, stripAudio: false },
  { slug: "risk-hold", query: "", out: "demo-risk-hold-hvac.webm", waitMs: 30_000, stripAudio: false },
];

function scenesForVertical(vertical) {
  if (vertical === "restoration") return RESTORATION_SCENES;
  if (vertical === "hvac") return HVAC_SCENES;
  return [...RESTORATION_SCENES, ...HVAC_SCENES];
}

async function waitForServer(attempts = 40) {
  const bases = [
    process.env.DEMO_RECORD_BASE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);
  for (let i = 0; i < attempts; i++) {
    for (const base of bases) {
      try {
        const res = await fetch(`${base}/demo/record/overview`, {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) return base.replace(/\/$/, "");
      } catch {
        /* retry */
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Dev server not ready (tried :3000 and :3001)");
}

function startDevServer() {
  return spawn("npm", ["run", "dev"], {
    cwd: ROOT,
    stdio: "ignore",
    env: { ...process.env, PORT: "3000" },
  });
}

async function recordScene(browser, slug, query, outName, waitMs) {
  const tmpDir = path.join(OUT_DIR, "_tmp");
  await mkdir(tmpDir, { recursive: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: tmpDir, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/demo/record/${slug}${query}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(1200);
  await page.waitForTimeout(waitMs);
  await context.close();

  const files = await import("node:fs/promises").then((fs) => fs.readdir(tmpDir));
  const webm = files.find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error(`No video recorded for ${slug}${query}`);

  const dest = path.join(OUT_DIR, outName);
  await rename(path.join(tmpDir, webm), dest);
  await rm(tmpDir, { recursive: true, force: true });
  console.log("  →", dest);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const vertical = process.env.DEMO_VERTICAL?.trim() || "all";
  const SCENES = scenesForVertical(vertical);

  let devProc = null;
  let startedDev = false;
  try {
    BASE = await waitForServer(3);
  } catch {
    console.log("[demo:record] Starting dev server…");
    devProc = startDevServer();
    startedDev = true;
    BASE = await waitForServer();
  }

  console.log("[demo:record] Recording demos at", BASE, `(${vertical})`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  for (const scene of SCENES) {
    console.log(`  Scene: ${scene.slug}${scene.query}`);
    await recordScene(browser, scene.slug, scene.query, scene.out, scene.waitMs);
  }

  await browser.close();
  if (devProc && startedDev) devProc.kill("SIGTERM");

  console.log("[demo:record] Converting to MP4…");
  const { execSync } = await import("node:child_process");
  for (const scene of SCENES) {
    const webm = path.join(OUT_DIR, scene.out);
    const mp4 = path.join(OUT_DIR, scene.out.replace(".webm", ".mp4"));
    const stripAudio = scene.stripAudio;
    try {
      execSync(
        `ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart ${stripAudio ? "-an" : ""} "${mp4}"`,
        { stdio: "ignore" },
      );
    } catch {
      console.warn("[demo:record] ffmpeg skip (install ffmpeg for MP4 fallback)");
    }
  }

  try {
    console.log("[demo:record] Generating narration + muxing audio into all demos…");
    execSync("npm run demo:tts", { cwd: ROOT, stdio: "inherit" });
    const muxTarget =
      vertical === "hvac" ? "hvac-all" : vertical === "restoration" ? "restoration-all" : "all";
    execSync(`node scripts/mux-demo-audio.mjs ${muxTarget}`, { cwd: ROOT, stdio: "inherit" });
  } catch (e) {
    console.warn("[demo:record] Demo audio mux skipped:", e.message ?? e);
  }

  console.log("[demo:record] Done —", SCENES.length, "demos in public/videos/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
