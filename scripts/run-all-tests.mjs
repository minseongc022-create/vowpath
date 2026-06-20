/**
 * Run unit + E2E tests (requires dev server on :3000).
 * Usage: node scripts/run-all-tests.mjs [port]
 */
import { spawn } from "child_process";
import { ensureDevUser } from "./lib/e2e-session.mjs";

const port = Number(process.argv[2] || process.env.PORT || 3000);
const base = `http://localhost:${port}`;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, PORT: String(port) },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function waitForServer(maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(base, { method: "GET" });
      if (res.ok || res.status === 404) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Server not ready at ${base}`);
}

let devProc = null;
const health = await fetch(base).catch(() => null);
if (!health?.ok && health?.status !== 404) {
  console.log(`Starting dev server on ${base}…`);
  devProc = spawn("npm", ["run", "dev"], {
    stdio: "ignore",
    shell: true,
    detached: false,
  });
  await waitForServer();
}

ensureDevUser();

try {
  console.log("\n=== Unit tests ===");
  await run("node", ["--experimental-strip-types", "--test", "tests/unit/auto-book-policy.test.mjs"]);
  await run("node", ["--experimental-strip-types", "--test", "tests/unit/auto-book-gate.test.mjs"]);
  await run("node", ["scripts/test-priority-guardrails.mjs"]);

  console.log("\n=== E2E: smart booking + SMS + Twilio inbound ===");
  await run("node", ["scripts/run-smart-booking-e2e.mjs", String(port)]);
  await run("node", ["scripts/run-sms-flows-e2e.mjs", String(port)]);
  await run("node", ["scripts/run-twilio-inbound-e2e.mjs", String(port)]);

  console.log("\n=== Live Twilio SMS (paid account) ===");
  try {
    await run("node", ["scripts/sms-diagnose.mjs"]);
  } catch (e) {
    console.warn("⚠ sms-diagnose failed:", e.message);
  }

  console.log("\n✅ All tests passed");
} finally {
  if (devProc) {
    devProc.kill();
  }
}
