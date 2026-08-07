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
대시보드:  npm run phone  →  폰에서 Wi‑Fi 주소로 접속 (홈 화면 추가)

다음 단계 (폰 또는 PC):
  1) 설정 탭 → LLM API 키 저장
  2) 연결 탭 → WordPress / Blogger / 네이버
  3) 홈 → [3개 플랫폼 전부 생성]

알림 (ntfy): https://ntfy.sh/${topic}
  → ntfy 앱 설치 후 [폰 알림 켜기] 또는 토픽 구독

생성된 글: data/inbox/latest.json
========================================
`);
}
