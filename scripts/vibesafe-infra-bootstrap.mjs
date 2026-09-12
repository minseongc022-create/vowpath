#!/usr/bin/env node
/**
 * VibeSafe 운영 준비 — 필요한 비밀값을 만들어 Vercel에 올리고, 빠진 것을 알려준다.
 *
 * 실행:
 *   VERCEL_TOKEN=... node scripts/vibesafe-infra-bootstrap.mjs
 *   또는 .github/workflows/vibesafe-infra-bootstrap.yml 을 수동 실행
 *
 * ★ 이미 있는 값은 절대 덮어쓰지 않는다
 *
 * VIBESAFE_ENCRYPTION_KEY를 바꾸면 **이미 저장된 GitHub 토큰과 테스트 계정을
 * 전부 복호화할 수 없게 된다**. 사용자는 영문도 모른 채 "GitHub 연결이
 * 끊겼다"를 보게 된다. 그래서 기본 동작은 "없으면 만들고, 있으면 둔다"이고,
 * 바꾸려면 --rotate=KEY_NAME 으로 어느 값을 바꾸는지 이름을 대야 한다.
 */
import { randomBytes } from "node:crypto";
import { resolveProjectId, vercelApi, vercelToken } from "./lib/vercel-infra.mjs";

const TARGETS = ["production", "preview", "development"];

/** 우리가 만들어 줄 수 있는 값 — 전부 무작위 비밀이다. */
const GENERATED = {
  VIBESAFE_AUTH_SECRET: {
    make: () => randomBytes(32).toString("base64"),
    why: "로그인 세션 서명",
    rotateCost: "모든 사용자가 한 번 다시 로그인해야 한다 (그 외 피해 없음)",
  },
  VIBESAFE_ENCRYPTION_KEY: {
    make: () => randomBytes(32).toString("base64"),
    why: "GitHub 토큰·테스트 계정 암호화",
    rotateCost: "★ 저장된 GitHub 연결과 테스트 계정을 전부 복호화할 수 없게 된다",
  },
  VIBESAFE_RUNNER_TOKEN: {
    make: () => randomBytes(32).toString("base64url"),
    why: "브라우저 워커 인증",
    rotateCost: "워커의 VIBESAFE_RUNNER_TOKEN도 같이 바꿔야 검사가 다시 돈다",
  },
};

/** 우리가 만들어 줄 수 없는 값 — 사람이 자기 계정에서 가져와야 한다. */
const MANUAL = {
  VIBESAFE_DATABASE_URL: {
    why: "DB 사용 플래그",
    how: "Vercel에 이미 있는 DATABASE_URL과 **같은 값**을 넣는다.",
    required: true,
  },
  ANTHROPIC_API_KEY: {
    why: "저장소 분석 (OPENAI_API_KEY로 대체 가능)",
    how: "console.anthropic.com → API Keys → Create Key",
    required: true,
    alternatives: ["OPENAI_API_KEY"],
  },
  RESEND_API_KEY: {
    why: "장애 이메일 알림",
    how: "resend.com → API Keys. 없으면 앱 안 알림만 동작한다.",
    required: false,
  },
};

const rotateArg = process.argv.find((a) => a.startsWith("--rotate="));
const rotateKey = rotateArg ? rotateArg.slice("--rotate=".length).trim() : null;
const dryRun = process.argv.includes("--dry-run");

function mask(value) {
  if (!value) return "(없음)";
  return value.length <= 8 ? "•".repeat(value.length) : `${value.slice(0, 4)}…${"•".repeat(6)}`;
}

async function listEnv(projectId) {
  const json = await vercelApi(`/v10/projects/${projectId}/env`);
  return json.envs ?? [];
}

async function upsert(projectId, key, value, existing) {
  if (dryRun) {
    console.log(`  [dry-run] ${key} ${existing ? "갱신" : "생성"} 예정`);
    return;
  }
  if (existing) {
    await vercelApi(`/v10/projects/${projectId}/env/${existing.id}`, "PATCH", {
      value,
      type: "encrypted",
      target: existing.target?.length ? existing.target : TARGETS,
    });
  } else {
    await vercelApi(`/v10/projects/${projectId}/env`, "POST", {
      key,
      value,
      type: "encrypted",
      target: TARGETS,
    });
  }
}

async function main() {
  console.log("\n=== VibeSafe 운영 준비 ===\n");

  if (!vercelToken()) {
    console.log("VERCEL_TOKEN이 없습니다. Vercel에 자동 반영하지 않고, 넣을 값만 출력합니다.\n");
    console.log("아래 값을 Vercel → Settings → Environment Variables 에 추가하세요:\n");
    for (const [key, spec] of Object.entries(GENERATED)) {
      console.log(`${key}=${spec.make()}`);
    }
    console.log("");
    printManual(new Set());
    console.log("\n(자동 반영하려면: VERCEL_TOKEN=... node scripts/vibesafe-infra-bootstrap.mjs)\n");
    return;
  }

  const projectId = await resolveProjectId();
  if (!projectId) throw new Error("Vercel 프로젝트를 찾지 못했습니다. VERCEL_PROJECT_ID를 설정하세요.");

  const envs = await listEnv(projectId);
  const have = new Map(envs.map((e) => [e.key, e]));

  console.log("--- 자동 생성 값 ---\n");
  for (const [key, spec] of Object.entries(GENERATED)) {
    const existing = have.get(key);

    if (existing && key !== rotateKey) {
      console.log(`○ ${key} — 이미 있음, 그대로 둔다`);
      console.log(`    바꾸려면: --rotate=${key}`);
      console.log(`    바꾸면: ${spec.rotateCost}`);
      continue;
    }
    if (existing && key === rotateKey) {
      console.log(`⚠ ${key} — 교체한다. ${spec.rotateCost}`);
    }

    const value = spec.make();
    await upsert(projectId, key, value, existing);
    console.log(`✓ ${key} ${existing ? "교체됨" : "생성됨"} (${spec.why}) — ${mask(value)}`);

    if (key === "VIBESAFE_RUNNER_TOKEN") {
      console.log("");
      console.log("  ★ 이 값을 GitHub 저장소 Secrets에도 넣어야 워커가 돈다:");
      console.log("    Settings → Secrets and variables → Actions → New repository secret");
      console.log(`    이름: VIBESAFE_RUNNER_TOKEN`);
      console.log(`    값:   ${value}`);
      console.log("    (이 화면에서만 볼 수 있다 — Vercel은 암호화 저장이라 다시 못 읽는다)");
      console.log("");
    }
  }

  console.log("\n--- 사람이 넣어야 하는 값 ---\n");
  printManual(new Set(have.keys()));

  console.log("--- 다음 단계 ---\n");
  console.log("1. 위에서 '빠짐'으로 나온 값을 Vercel에 추가한다");
  console.log("2. DB 테이블 생성:  npm run vibesafe:push   (DATABASE_URL이 있는 곳에서)");
  console.log("3. 재배포 (환경변수는 재배포해야 반영된다)");
  console.log("4. 설정 확인:  https://<도메인>/vibesafe/setup");
  console.log("5. 워커 켜기:  GitHub → Actions → 'VibeSafe 브라우저 워커' → Run workflow\n");
}

function printManual(haveKeys) {
  for (const [key, spec] of Object.entries(MANUAL)) {
    const satisfied =
      haveKeys.has(key) || (spec.alternatives ?? []).some((alt) => haveKeys.has(alt));
    const mark = satisfied ? "✓" : spec.required ? "✗" : "○";
    const state = satisfied ? "있음" : spec.required ? "빠짐 (필수)" : "없음 (선택)";
    console.log(`${mark} ${key} — ${state}`);
    console.log(`    쓰임: ${spec.why}`);
    if (!satisfied) console.log(`    받는 곳: ${spec.how}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error("\n✗ 실패:", error.message);
  process.exit(1);
});
