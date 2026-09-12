import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * 설정 점검 화면은 **로그인 없이** 열린다 — DB가 안 붙으면 로그인 자체가
 * 안 되기 때문이다. 그래서 이 화면이 무엇을 내보내는지가 곧 공개 정보다.
 * 아래 테스트가 지키는 것: 어떤 상태에서도 값이 새지 않는다.
 */

const SECRETS = {
  VIBESAFE_ENCRYPTION_KEY: Buffer.from("y".repeat(32)).toString("base64"),
  VIBESAFE_AUTH_SECRET: "z".repeat(48),
  VIBESAFE_RUNNER_TOKEN: "w".repeat(40),
  OPENAI_API_KEY: "sk-secret-value-must-never-appear-in-output",
  CRON_SECRET: "cron-secret-value-must-never-appear",
  VIBESAFE_GITHUB_WEBHOOK_SECRET: "webhook-secret-must-never-appear",
};

for (const [k, v] of Object.entries(SECRETS)) process.env[k] = v;
// DB 미설정 경로 — prisma를 건드리지 않아 DB 없이도 검증할 수 있다.
delete process.env.VIBESAFE_DATABASE_URL;

const { getSetupStatus } = await import("@/vibesafe/lib/setup-status");

test("DB가 없으면 그 사실을 분명히 말한다", async () => {
  const status = await getSetupStatus();
  assert.equal(status.ready, false);
  assert.equal(status.runtime, null);
  const db = status.checks.find((c) => c.key === "database");
  assert.equal(db.state, "missing");
});

test("어떤 비밀값도 결과에 담기지 않는다", async () => {
  const serialized = JSON.stringify(await getSetupStatus());
  for (const [key, value] of Object.entries(SECRETS)) {
    assert.ok(!serialized.includes(value), `${key} 값이 새어 나왔다`);
  }
});

test("headline은 '0개 남았습니다' 같은 말을 만들지 않는다", async () => {
  const status = await getSetupStatus();
  assert.ok(!/\b0개 남았습니다/.test(status.headline), `쓸모없는 안내: ${status.headline}`);
  assert.ok(status.headline.length > 0);
});

test("선택 항목은 준비 여부를 막지 않는다", async () => {
  const status = await getSetupStatus();
  const optional = status.checks.filter((c) => c.state === "optional").map((c) => c.key);
  assert.ok(optional.includes("github_app"), "GitHub App은 없어도 동작해야 한다");
  assert.ok(optional.includes("email"), "이메일은 없어도 동작해야 한다");
});

test("빠진 항목마다 무엇을 해야 하는지 알려준다", async () => {
  const status = await getSetupStatus();
  for (const check of status.checks.filter((c) => c.state === "missing")) {
    assert.ok(check.fix && check.fix.length > 10, `${check.key} 에 조치 안내가 없다`);
  }
});
