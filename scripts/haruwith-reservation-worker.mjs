const baseUrl = (process.env.HARUWITH_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const token = process.env.HARUWITH_WORKER_TOKEN || process.env.CRON_SECRET;
const intervalMs = Math.max(2_000, Number(process.env.HARUWITH_WORKER_POLL_MS || 5_000));

if (!token) {
  console.error("HARUWITH_WORKER_TOKEN (or CRON_SECRET) is required.");
  process.exit(1);
}

let stopping = false;
let running = false;

async function tick() {
  if (running || stopping) return;
  running = true;
  try {
    const response = await fetch(`${baseUrl}/api/cron/haruwith-reservations`, { method: "POST", headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25_000) });
    if (!response.ok) console.error(`[haruwith-reservation-worker] ${response.status} ${await response.text()}`);
  } catch (error) {
    console.error("[haruwith-reservation-worker] tick failed", error instanceof Error ? error.message : error);
  } finally {
    running = false;
  }
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

await tick();
while (!stopping) {
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
  await tick();
}
