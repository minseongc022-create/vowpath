import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { ROOT, loadEnvFile } from "../config/load.ts";
import { readEnvConfig, writeEnvConfig, applyEnvConfig } from "../config/env-store.ts";
import { applyConnectionsToEnv } from "../connections/store.ts";
import { runGenerateAll } from "../pipeline/produce.ts";
import { buildNotifyPayload, notifyComplete } from "../notify/index.ts";
import { log } from "../lib/utils.ts";

export async function bootstrapAll(): Promise<void> {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    copyFileSync(join(ROOT, ".env.example"), envPath);
    log("info", "Created .env from .env.example");
  }

  mkdirSync(join(ROOT, "data"), { recursive: true });

  const cfg = readEnvConfig();
  const updates: Record<string, string> = {};

  if (!cfg.NTFY_TOPIC) {
    updates.NTFY_TOPIC = `content-autopilot-${randomBytes(4).toString("hex")}`;
  }
  if (!cfg.PUBLISH_MODE) {
    updates.PUBLISH_MODE = "draft";
  }

  if (Object.keys(updates).length) {
    writeEnvConfig(updates);
    log("info", "Updated .env defaults", updates);
  }

  loadEnvFile();
  applyEnvConfig(readEnvConfig());
  applyConnectionsToEnv();

  if (!process.env.LLM_API_KEY) {
    process.env.MOCK_LLM = "1";
    log("warn", "LLM_API_KEY 없음 → MOCK_LLM=1 (대시보드에서 API 키 저장 후 generate-all 재실행)");
  }

  log("info", "Generating 3 platform posts…");
  const results = await runGenerateAll();
  await notifyComplete(buildNotifyPayload(results));

  const topic = readEnvConfig().NTFY_TOPIC || process.env.NTFY_TOPIC;
  console.log(`
========================================
✅ Content Autopilot 초기 설정 완료
========================================
대시보드:  npm run dashboard  →  http://127.0.0.1:${process.env.DASHBOARD_PORT || 3847}

다음 단계 (대시보드에서):
  1) LLM API 키 저장
  2) WordPress / Google Blogger / 네이버 ID 연결
  3) [3개 플랫폼 전부 생성] 클릭

알림 (ntfy): https://ntfy.sh/${topic}
  → 폰 ntfy 앱에서 위 토픽 구독

생성된 글: data/inbox/latest.json
========================================
`);
}
