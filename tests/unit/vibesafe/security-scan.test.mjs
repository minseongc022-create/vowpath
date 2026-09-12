import { test } from "node:test";
import assert from "node:assert/strict";
import { scanForSecurityIssues } from "@/vibesafe/lib/analysis/security-scan";

const file = (path, content) => ({ path, content, truncated: false });

test("브라우저로 내려가는 service_role 키를 잡는다", () => {
  const findings = scanForSecurityIssues([
    file("lib/supabase.ts", `const url = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;`),
  ]);
  const hit = findings.find((f) => f.rule === "supabase_service_role_public");
  assert.ok(hit, "service_role 노출을 놓쳤다");
  assert.equal(hit.severity, "high");
});

test("발견한 값 자체는 저장하지 않는다", () => {
  const token = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789";
  const findings = scanForSecurityIssues([file("lib/ai.ts", `const key = "${token}";`)]);
  const hit = findings.find((f) => f.rule === "openai_key_literal");
  assert.ok(hit);
  assert.ok(!hit.evidence.includes(token), "원본 키가 그대로 남으면 안 된다");
  assert.ok(hit.evidence.includes("…"));
});

test("GitHub 토큰 리터럴을 잡는다", () => {
  const findings = scanForSecurityIssues([
    file("scripts/deploy.ts", `const t = "ghp_${"a".repeat(36)}";`),
  ]);
  assert.ok(findings.some((f) => f.rule === "github_token_literal"));
});

test(".env.example의 자리표시자는 오탐하지 않는다", () => {
  const findings = scanForSecurityIssues([
    file(".env.example", `OPENAI_API_KEY=sk-your-key-here-replace-me-1234567\nJWT=eyJhbGci.eyJzdWIi.abcdefghij`),
  ]);
  assert.equal(
    findings.filter((f) => f.rule === "openai_key_literal" || f.rule === "service_role_literal").length,
    0,
    "정상적인 저장소마다 경고가 뜨면 아무도 안 본다",
  );
});

test("인증 검사가 없는 쓰기 API를 짚는다", () => {
  const findings = scanForSecurityIssues([
    file("app/api/posts/route.ts", `export async function POST(request) {\n  const body = await request.json();\n  return Response.json({ ok: true });\n}`),
  ]);
  assert.ok(findings.some((f) => f.rule === "dangerous_public_endpoint"));
});

test("인증 검사가 있는 쓰기 API는 짚지 않는다", () => {
  const findings = scanForSecurityIssues([
    file("app/api/posts/route.ts", `import { auth } from "@/auth";\nexport async function POST(request) {\n  const session = await auth();\n  if (!session) return new Response(null, { status: 401 });\n  return Response.json({ ok: true });\n}`),
  ]);
  assert.equal(findings.filter((f) => f.rule === "dangerous_public_endpoint").length, 0);
});

test("읽기 전용 API는 대상이 아니다", () => {
  const findings = scanForSecurityIssues([
    file("app/api/list/route.ts", `export async function GET() { return Response.json([]); }`),
  ]);
  assert.equal(findings.filter((f) => f.rule === "dangerous_public_endpoint").length, 0);
});

test("서버 컴포넌트의 서버 전용 환경변수는 경고하지 않는다", () => {
  const findings = scanForSecurityIssues([
    file("lib/server-data.ts", `const key = process.env.DATABASE_URL;`),
  ]);
  assert.equal(findings.filter((f) => f.rule === "private_env_in_client").length, 0);
});

test("클라이언트 컴포넌트의 서버 전용 환경변수는 경고한다", () => {
  const findings = scanForSecurityIssues([
    file("components/Widget.tsx", `"use client";\nconst key = process.env.STRIPE_SECRET_KEY;`),
  ]);
  assert.ok(findings.some((f) => f.rule === "private_env_in_client"));
});

/**
 * 아래 세 개는 실제 저장소에 스캐너를 돌려보고 추가했다.
 * 경고 10건 중 8건이 로그인·가입 주소였다 — 오탐이 8할이면 아무도 안 본다.
 */
test("로그인·가입 주소는 인증이 없는 게 정상이라 짚지 않는다", () => {
  const paths = [
    "app/api/auth/login/route.ts",
    "app/api/auth/signup/route.ts",
    "app/api/auth/reset-password/route.ts",
    "app/api/auth/forgot-password/route.ts",
    "pages/api/auth/callback.ts",
  ];
  for (const path of paths) {
    const findings = scanForSecurityIssues([
      file(path, `export async function POST(request) { return Response.json({}); }`),
    ]);
    assert.equal(
      findings.filter((f) => f.rule === "dangerous_public_endpoint").length,
      0,
      `${path} 는 공개가 정상이다`,
    );
  }
});

test("webhook·cron 주소도 짚지 않는다", () => {
  for (const path of ["app/api/webhooks/stripe/route.ts", "app/api/cron/sweep/route.ts"]) {
    const findings = scanForSecurityIssues([
      file(path, `export async function POST() { return Response.json({}); }`),
    ]);
    assert.equal(findings.filter((f) => f.rule === "dangerous_public_endpoint").length, 0, path);
  }
});

test("세션이 아니라 서명으로 자신을 지키는 라우트도 보호된 것으로 본다", () => {
  const findings = scanForSecurityIssues([
    file(
      "app/api/receive/route.ts",
      `import { createHmac, timingSafeEqual } from "crypto";\nexport async function POST(req) {\n  const sig = req.headers.get("x-hub-signature-256");\n  return Response.json({});\n}`,
    ),
  ]);
  assert.equal(findings.filter((f) => f.rule === "dangerous_public_endpoint").length, 0);
});

test("진짜 보호가 없는 쓰기 주소는 여전히 짚는다", () => {
  const findings = scanForSecurityIssues([
    file("app/api/posts/delete/route.ts", `export async function DELETE(req) { return Response.json({}); }`),
  ]);
  assert.ok(findings.some((f) => f.rule === "dangerous_public_endpoint"), "이건 놓치면 안 된다");
});
