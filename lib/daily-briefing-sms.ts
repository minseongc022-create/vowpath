import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { getBookingRequestStatuses } from "./booking-status";
import { buildDailyBriefing } from "./dashboard-briefing";
import { listCallLogs } from "./call-logs";
import { getCompanyAiMemory } from "./company-ai-memory";
import { listJobs } from "./jobs-db";
import { fetchJobberRequestsInRange } from "./jobber-api";
import { getJobberTokens } from "./jobber-tokens";
import { kvGetSafe } from "./kv-safe";
import { useKvStore } from "./kv-config";
import { sendSms } from "./send-sms";
import { listUsers } from "./users-db";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "daily-briefing-sends.json");

type SendStore = Record<string, string>;

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function sentKey(userId: string, date = todayKey()) {
  return `${userId}:${date}`;
}

function kvSentKey(userId: string, date = todayKey()) {
  return `effiroad:daily-briefing-sent:${userId}:${date}`;
}

async function readFileStore(): Promise<SendStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(FILE, "utf-8")) as SendStore;
  } catch {
    return {};
  }
}

async function writeFileStore(store: SendStore) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function wasSent(userId: string): Promise<boolean> {
  if (useKvStore()) {
    return Boolean(await kvGetSafe<string>(kvSentKey(userId)));
  }
  return Boolean((await readFileStore())[sentKey(userId)]);
}

async function markSent(userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (useKvStore()) {
    await kv.set(kvSentKey(userId), now, { ex: 60 * 60 * 36 });
    return;
  }
  if (process.env.VERCEL === "1") throw new Error("KV_REQUIRED");
  const store = await readFileStore();
  store[sentKey(userId)] = now;
  await writeFileStore(store);
}

function metric(metrics: ReturnType<typeof buildDailyBriefing>["metrics"], label: string) {
  return metrics.find((item) => item.label === label)?.value ?? "No data";
}

function briefingSmsBody(shopName: string, briefing: ReturnType<typeof buildDailyBriefing>) {
  const requests =
    Number(metric(briefing.metrics, "Approved Requests")) +
    Number(metric(briefing.metrics, "Pending Requests")) +
    Number(metric(briefing.metrics, "Declined Requests"));
  return [
    `${shopName} Yesterday's Briefing`,
    `Calls: ${metric(briefing.metrics, "Today's Calls")}`,
    `Requests: ${Number.isFinite(requests) ? requests : "No data"}`,
    `Approved: ${metric(briefing.metrics, "Approved Requests")}`,
    `Pending: ${metric(briefing.metrics, "Pending Requests")}`,
    `Urgent: ${metric(briefing.metrics, "Urgent Requests")}`,
    `Most common issue: ${metric(briefing.metrics, "Most Requested Service")}`,
  ].join("\n");
}

export async function processDailyBriefingSmsCron() {
  const users = await listUsers();
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  const range = {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const memory = await getCompanyAiMemory(user.id);
      if (!memory.dailyBriefingSmsEnabled || !user.phone) {
        skipped += 1;
        continue;
      }
      if (await wasSent(user.id)) {
        skipped += 1;
        continue;
      }

      const [calls, jobs, requestStatuses, tokens] = await Promise.all([
        listCallLogs(user.id, range),
        listJobs(user.id, range),
        getBookingRequestStatuses(user.id),
        getJobberTokens(user.id),
      ]);
      const jobberBookings = tokens
        ? await fetchJobberRequestsInRange(user.id, start, end).catch(() => [])
        : [];

      const briefing = buildDailyBriefing({
        calls,
        jobs,
        jobberBookings,
        requestStatuses,
        now: start,
      });
      const result = await sendSms(
        user.phone,
        briefingSmsBody(user.shopName, briefing),
        "daily briefing",
        {
          context: { userId: user.id, operation: "daily_briefing_sms" },
          usRecipientsOnly: false,
        },
      );
      if (!result.ok) {
        failed += 1;
        continue;
      }
      await markSent(user.id);
      sent += 1;
    } catch (e) {
      failed += 1;
      console.warn("[daily-briefing-sms] user failed", user.id, e);
    }
  }

  return { sent, skipped, failed, users: users.length };
}
