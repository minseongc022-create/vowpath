import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ProduceResult } from "../config/types.ts";
import { ROOT } from "../config/load.ts";
import { log } from "../lib/utils.ts";

export async function loadInbox(): Promise<(NotifyPayload & { at?: string; path?: string }) | null> {
  try {
    const raw = readFileSync(join(ROOT, "data", "inbox", "latest.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export type NotifyPayload = {
  title: string;
  body: string;
  results: Array<{
    brandId: string;
    title: string;
    chars: number;
    platform: string;
    url?: string;
    passed: boolean;
  }>;
};

export async function notifyComplete(payload: NotifyPayload): Promise<void> {
  const inbox = join(ROOT, "data", "inbox");
  mkdirSync(inbox, { recursive: true });
  const stamp = Date.now();
  const path = join(inbox, `done-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ ...payload, at: new Date().toISOString() }, null, 2), "utf8");
  writeFileSync(join(inbox, "latest.json"), JSON.stringify({ ...payload, at: new Date().toISOString(), path }, null, 2), "utf8");

  const banner = `
========================================
✅ content-autopilot 완료
${payload.title}
${payload.body}
저장: ${path}
========================================`;
  console.log(banner);

  const webhook = process.env.NOTIFY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      log("info", "Webhook notification sent");
    } catch (e) {
      log("warn", "Webhook failed", e);
    }
  }

  const ntfy = process.env.NTFY_TOPIC;
  if (ntfy) {
    try {
      await fetch(`https://ntfy.sh/${ntfy}`, {
        method: "POST",
        headers: {
          Title: "Content Autopilot done",
          Tags: "white_check_mark",
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: payload.body,
      });
      log("info", "ntfy notification sent");
    } catch (e) {
      log("warn", "ntfy failed", e);
    }
  }
}

export function buildNotifyPayload(results: ProduceResult[]): NotifyPayload {
  const lines = results.map(
    (r) =>
      `• [${r.brandId}] ${r.article.title} (${r.article.charCount}자) → ${r.published?.platform || "?"} ${r.published?.url || ""}`
  );
  return {
    title: "블로그 초안 생성 완료",
    body: `${results.length}편 생성됨\n\n${lines.join("\n")}`,
    results: results.map((r) => ({
      brandId: r.brandId,
      title: r.article.title,
      chars: r.article.charCount,
      platform: r.published?.platform || "unknown",
      url: r.published?.url,
      passed: r.quality.passed,
    })),
  };
}
