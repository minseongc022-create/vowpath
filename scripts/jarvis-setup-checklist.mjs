/**
 * Jarvis / Effiroad production readiness checklist (local env inspection).
 * Usage: node scripts/jarvis-setup-checklist.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GROUPS = [
  {
    title: "Infrastructure (required prod)",
    keys: [
      ["AUTH_SECRET", true],
      ["CRON_SECRET", true],
      ["KV_REST_API_URL", true],
      ["KV_REST_API_TOKEN", true],
    ],
  },
  {
    title: "Jarvis AI detail + market",
    keys: [
      ["OPENAI_API_KEY", false],
      ["JARVIS_OPENAI_MODEL", false],
      ["DRAPH_API_URL", false],
      ["DRAPH_API_KEY", false],
      ["HOOKABLE_API_URL", false],
      ["HOOKABLE_API_KEY", false],
    ],
  },
  {
    title: "Toss Shopping FEP (live sync + publish)",
    keys: [
      ["TOSS_SHOPPING_ACCESS_KEY", false],
      ["TOSS_SHOPPING_SECRET_KEY", false],
      ["TOSS_SHOP_DEFAULT_CATEGORY_ID", false],
      ["TOSS_SHOP_CATEGORY_ID_MAP", false],
      ["JARVIS_AUTO_CATEGORY", false],
      ["TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID", false],
      ["TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP", false],
      ["TOSS_SHOP_RETURN_LOCATION_STRICT", false],
      ["TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED", false],
    ],
  },
  {
    title: "Wholesale sourcing (도매처 다중 연동)",
    keys: [
      ["DOMEGGOOK_API_KEY", false],
      ["OWNERCLAN_API_KEY", false],
      ["ONCH_API_KEY", false],
      ["ZENTRADE_API_KEY", false],
      ["DOMETOPIA_API_KEY", false],
    ],
  },
  {
    title: "효자상품·광고 효율",
    keys: [
      ["TOSS_SHOP_DAILY_AD_BUDGET_KRW", false],
      ["TOSS_SHOP_MONTHLY_GOAL_KRW", false],
    ],
  },
  {
    title: "채널 모드 (지금은 토스 위탁 전용)",
    keys: [["TOSS_SHOP_IMPORT_SALES_ENABLED", false]],
  },
  {
    title: "Billing (Pro)",
    keys: [
      ["LEMON_SQUEEZY_API_KEY", false],
      ["LEMON_SQUEEZY_STORE_ID", false],
      ["LEMON_SQUEEZY_WEBHOOK_SECRET", false],
    ],
  },
  {
    title: "In vercel.json build.env (no secret needed)",
    keys: [
      ["JARVIS_AUTOPILOT_ENABLED", false],
      ["TOSS_SHOP_OWNER_EMAILS", false],
      ["TOSS_SHOP_PRO_ACTIVATION_CODE", false],
    ],
  },
  {
    title: "Autopilot tuning (optional)",
    keys: [
      ["JARVIS_AUTO_EXECUTE", false],
      ["JARVIS_AUTOPILOT_PICKS_PER_CYCLE", false],
    ],
  },
  {
    title: "AI 이미지 스튜디오 (선택 — OPENAI_API_KEY 있으면 기본 ON)",
    keys: [
      ["JARVIS_AI_IMAGES", false],
      ["JARVIS_SHOT_KINDS", false],
      ["JARVIS_MAX_SHOTS_PER_PRODUCT", false],
      ["JARVIS_IMAGE_MODEL", false],
      ["JARVIS_IMAGE_SIZE", false],
    ],
  },
];

function inVercelJson(key) {
  try {
    const v = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
    return Boolean(v.build?.env?.[key]);
  } catch {
    return false;
  }
}

function status(key, required) {
  const val = process.env[key]?.trim();
  if (val) return { icon: "✓", note: "set locally" };
  if (inVercelJson(key)) return { icon: "○", note: "in vercel.json build.env" };
  if (required) return { icon: "✗", note: "MISSING (required)" };
  return { icon: "·", note: "optional — not set" };
}

console.log("\n=== Jarvis / Effiroad setup checklist ===\n");

let missingRequired = 0;
for (const group of GROUPS) {
  console.log(`## ${group.title}`);
  for (const [key, required] of group.keys) {
    const s = status(key, required);
    if (s.icon === "✗") missingRequired++;
    console.log(`  ${s.icon} ${key} — ${s.note}`);
  }
  console.log("");
}

// 반품지 매핑은 깨져 있으면 전 상품 등록이 차단되므로 로컬에서 먼저 검증한다.
function checkReturnLocationMap() {
  const raw = process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP?.trim();
  const defaultId = process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID?.trim();
  const sellerOwned =
    process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED?.trim().toLowerCase() === "true";
  console.log("## 교환·반품지 매핑 검증");

  // 매핑 JSON은 더 이상 필수가 아니다. 자비스가 공급처 주소를 읽어
  // 토스 등록 반품지와 자동으로 대조하기 때문이다(return-location-matcher).
  // 매핑은 자동 매칭이 실패할 때의 수동 보정 수단으로만 남는다.
  if (!raw) {
    if (defaultId && sellerOwned) {
      console.log(
        `  ✓ 셀러 자체 반품지 ${defaultId} 선언됨 — 반품 안내가 없는 상품은 여기로 자동 등록`,
      );
      console.log("  · 공급처 직접수거로 확인된 상품은 공급처 주소를 찾아 자동 연결(미등록 시 보류)");
    } else if (defaultId) {
      console.log(
        `  ✗ 기본 반품지 ${defaultId}의 성격이 선언되지 않음 — TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED=true 필요`,
      );
      console.log("    (내 주소가 맞는지 선언하지 않으면 남의 공급처 주소로 반품이 갈 수 있어 차단됩니다)");
    } else {
      console.log("  ✗ 기본 반품지도 매핑도 없음 — 토스 등록 불가");
    }
    console.log("");
    return defaultId && sellerOwned ? 0 : 1;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.log(`  ✗ JSON 파싱 실패: ${e.message} — 이 상태로 배포하면 전 상품 등록이 차단됩니다`);
    console.log("");
    return 1;
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.log("  ✗ 최상위가 JSON 객체가 아님 (예: {\"domeggook:12345\":678})");
    console.log("");
    return 1;
  }

  const bad = Object.entries(parsed).filter(([, v]) => {
    const n = typeof v === "number" ? v : /^\d+$/.test(String(v)) ? Number(v) : NaN;
    return !Number.isInteger(n) || n <= 0;
  });
  if (bad.length) {
    for (const [k, v] of bad) console.log(`  ✗ "${k}": ${JSON.stringify(v)} — 반품지 ID는 양의 정수여야 함`);
    console.log("");
    return 1;
  }

  const entries = Object.keys(parsed);
  const supplierKeys = entries.filter((k) => k.includes(":") && !k.startsWith("mode:") && !k.startsWith("country:"));
  console.log(`  ✓ 매핑 ${entries.length}건 유효 (공급처 단위 ${supplierKeys.length}건)`);
  if (!defaultId && !entries.some((k) => k.startsWith("mode:"))) {
    console.log("  ⚠ 기본 반품지·mode:* 폴백이 없음 — 매핑에 없는 공급처는 등록 실패");
  }
  if (process.env.TOSS_SHOP_RETURN_LOCATION_STRICT?.trim().toLowerCase() === "true") {
    console.log("  · STRICT 활성 — 매핑에 없는 공급처는 등록 차단");
  }
  console.log("");
  return 0;
}

missingRequired += checkReturnLocationMap();

console.log("## External (not env vars)");
console.log("  · cron-job.org → GET /api/cron/toss-shop-sync every 60s + Bearer CRON_SECRET");
console.log("  · Vercel Production redeploy after env changes");
console.log("");

console.log("## Docs");
console.log("  · docs/JARVIS_CLAUDE_HANDOFF.md — full Claude handoff");
console.log("  · docs/TOSS_SHOP_SETUP.md — env reference");
console.log("  · CRON.md — 60s cron truth\n");

if (missingRequired > 0) {
  console.log(`⚠ ${missingRequired} required key(s) missing in local env (may exist on Vercel).\n`);
} else {
  console.log("Local required keys OK (or covered by vercel.json).\n");
}

process.exit(0);
