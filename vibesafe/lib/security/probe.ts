import "server-only";

/**
 * 외부 공격 표면 점검.
 *
 * ★ 이건 방화벽도 침입 탐지도 아니다 — 그렇게 팔면 안 된다
 *
 * VibeSafe는 사용자 앱의 요청 경로에 끼어 있지 않다. 그래서 실시간으로 공격을
 * 막을 수 없다. 할 수 있는 건 다른 것이다:
 *
 *   **공격자가 제일 먼저 확인하는 것을, 공격자보다 먼저 확인한다.**
 *
 * 실제로 바이브코딩 앱이 털리는 경로는 거의 전부 이 목록 안에 있다 —
 * 인터넷에 그대로 열려 있는 .env, 브라우저 번들에 박힌 관리자 키, 로그인 없이
 * 열리는 /admin. 정교한 취약점이 아니라 "문을 안 잠갔다"에 가깝다.
 *
 * ★ 비파괴 원칙
 *
 * 모든 점검은 GET 또는 HEAD다. 데이터를 만들거나 지우거나 바꾸지 않는다.
 * 무차별 대입도, 퍼징도 하지 않는다. 남의 서비스에 부하를 주지 않는 선에서,
 * 브라우저로 직접 열어봤을 때 보이는 것만 본다.
 */

export type ProbeSeverity = "critical" | "high" | "medium" | "low";

export type ProbeFinding = {
  probe: string;
  severity: ProbeSeverity;
  title: string;
  target: string;
  evidence: string;
  advice: string;
};

const TIMEOUT_MS = 8_000;
const MAX_BODY_CHARS = 4_000;

async function safeGet(url: string): Promise<{ status: number; body: string; headers: Headers } | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "VibeSafe-SecurityProbe/1.0 (+https://effiroad.com/vibesafe)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.text().catch(() => "")).slice(0, MAX_BODY_CHARS);
    return { status: res.status, body, headers: res.headers };
  } catch {
    return null;
  }
}

/** 값을 증거로 남길 때는 항상 가린다 — 우리 DB가 남의 키 모음집이 되면 안 된다. */
function mask(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return "•".repeat(Math.max(v.length, 4));
  return `${v.slice(0, 4)}…${"•".repeat(6)}…${v.slice(-2)}`;
}

/** 인터넷에 그대로 열려 있으면 안 되는 파일들. */
const EXPOSED_FILES: { path: string; severity: ProbeSeverity; title: string; advice: string }[] = [
  {
    path: "/.env",
    severity: "critical",
    title: ".env 파일이 인터넷에 그대로 열려 있습니다",
    advice:
      "이 파일에는 DB 접속 정보와 API 키가 들어 있습니다. 지금 즉시 접근을 막고, 파일에 있던 모든 키를 재발급하세요. 이미 유출됐다고 가정해야 합니다.",
  },
  {
    path: "/.env.local",
    severity: "critical",
    title: ".env.local 파일이 인터넷에 열려 있습니다",
    advice: "즉시 접근을 막고 안에 있던 키를 전부 재발급하세요.",
  },
  {
    path: "/.env.production",
    severity: "critical",
    title: ".env.production 파일이 인터넷에 열려 있습니다",
    advice: "즉시 접근을 막고 안에 있던 키를 전부 재발급하세요.",
  },
  {
    path: "/.git/config",
    severity: "critical",
    title: ".git 디렉터리가 인터넷에 열려 있습니다",
    advice:
      "저장소 전체를 내려받을 수 있는 상태입니다. 배포에서 .git을 제외하고, 커밋 이력에 키가 있었다면 전부 재발급하세요.",
  },
  {
    path: "/backup.sql",
    severity: "critical",
    title: "데이터베이스 백업 파일이 인터넷에 열려 있습니다",
    advice: "즉시 삭제하거나 접근을 막으세요. 고객 데이터가 통째로 노출됩니다.",
  },
  {
    path: "/config.json",
    severity: "medium",
    title: "config.json이 열려 있습니다",
    advice: "안에 비밀 값이 없는지 확인하세요.",
  },
];

/** 로그인 없이 열리면 안 되는 경로. */
const ADMIN_PATHS = ["/admin", "/dashboard", "/api/admin", "/studio", "/_admin"];

/** HTML에서 찾으면 안 되는 값 (브라우저로 내려간 비밀). */
const SECRET_IN_BUNDLE: { re: RegExp; severity: ProbeSeverity; title: string; advice: string }[] = [
  {
    // Supabase service_role JWT는 payload에 "service_role"이 들어 있다.
    re: /eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g,
    severity: "critical",
    title: "브라우저로 내려간 코드에 service_role 키로 보이는 값이 있습니다",
    advice:
      "service_role 키는 RLS를 무시하고 DB 전체를 읽고 씁니다. 지금 Supabase에서 키를 재발급하고, 서버 코드에서만 사용하도록 고치세요.",
  },
  {
    re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/g,
    severity: "critical",
    title: "브라우저로 내려간 코드에 AI API 키가 있습니다",
    advice: "즉시 키를 폐기하고 서버에서만 호출하도록 고치세요. 남이 당신 계정으로 요금을 태울 수 있습니다.",
  },
  {
    re: /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
    severity: "critical",
    title: "브라우저로 내려간 코드에 GitHub 토큰이 있습니다",
    advice: "즉시 토큰을 폐기하세요.",
  },
  {
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    title: "브라우저로 내려간 코드에 AWS 액세스 키가 있습니다",
    advice: "즉시 키를 비활성화하고 재발급하세요.",
  },
];

function isJwtServiceRole(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const decoded = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return /"role"\s*:\s*"service_role"/.test(decoded);
  } catch {
    return false;
  }
}

async function probeExposedFiles(baseUrl: string): Promise<ProbeFinding[]> {
  const findings: ProbeFinding[] = [];
  for (const file of EXPOSED_FILES) {
    const url = `${baseUrl}${file.path}`;
    const res = await safeGet(url);
    if (!res || res.status !== 200) continue;

    // 200인데 HTML이면 SPA의 404 페이지일 가능성이 높다 — 오탐을 막는다.
    const looksLikeHtml = /<!doctype html|<html/i.test(res.body.slice(0, 200));
    if (looksLikeHtml) continue;
    if (res.body.trim().length === 0) continue;

    // .env로 보이려면 KEY=VALUE 모양이 있어야 한다.
    if (file.path.startsWith("/.env") && !/^[A-Z_][A-Z0-9_]*\s*=/m.test(res.body)) continue;
    if (file.path === "/.git/config" && !/\[core\]|\[remote/.test(res.body)) continue;

    findings.push({
      probe: `exposed_file${file.path.replace(/\//g, "_")}`,
      severity: file.severity,
      title: file.title,
      target: url,
      evidence: `HTTP 200, ${res.body.length}바이트 응답 (내용은 저장하지 않음)`,
      advice: file.advice,
    });
  }
  return findings;
}

async function probeSecurityHeaders(baseUrl: string): Promise<ProbeFinding[]> {
  const res = await safeGet(baseUrl);
  if (!res) return [];
  const findings: ProbeFinding[] = [];
  const h = res.headers;

  if (!h.get("x-frame-options") && !h.get("content-security-policy")?.includes("frame-ancestors")) {
    findings.push({
      probe: "missing_frame_protection",
      severity: "medium",
      title: "다른 사이트가 당신의 화면을 몰래 덮어씌울 수 있습니다",
      target: baseUrl,
      evidence: "X-Frame-Options / CSP frame-ancestors 헤더가 없습니다",
      advice:
        "클릭재킹 공격에 열려 있습니다. next.config에 X-Frame-Options: DENY 헤더를 추가하세요.",
    });
  }
  if (!h.get("strict-transport-security") && baseUrl.startsWith("https://")) {
    findings.push({
      probe: "missing_hsts",
      severity: "low",
      title: "HTTPS 강제 설정(HSTS)이 없습니다",
      target: baseUrl,
      evidence: "Strict-Transport-Security 헤더가 없습니다",
      advice: "Vercel은 보통 자동으로 붙여줍니다. 커스텀 도메인 설정을 확인해보세요.",
    });
  }
  if (!h.get("x-content-type-options")) {
    findings.push({
      probe: "missing_nosniff",
      severity: "low",
      title: "브라우저가 파일 종류를 추측하도록 열려 있습니다",
      target: baseUrl,
      evidence: "X-Content-Type-Options: nosniff 헤더가 없습니다",
      advice: "next.config의 headers()에 추가하세요.",
    });
  }
  return findings;
}

async function probeSecretsInBundle(baseUrl: string): Promise<ProbeFinding[]> {
  const findings: ProbeFinding[] = [];
  const page = await safeGet(baseUrl);
  if (!page) return findings;

  // HTML에 직접 박힌 값 + 첫 화면이 불러오는 스크립트 몇 개만 본다.
  // 번들 전체를 긁으면 남의 서버에 부담이 되고, 우리가 볼 필요도 없다.
  const scriptUrls = [...page.body.matchAll(/src="([^"]+\.js)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith("http") || u.startsWith(baseUrl))
    .slice(0, 5)
    .map((u) => (u.startsWith("http") ? u : new URL(u, baseUrl).toString()));

  const sources: { label: string; text: string }[] = [{ label: baseUrl, text: page.body }];
  for (const url of scriptUrls) {
    const res = await safeGet(url);
    if (res?.status === 200) sources.push({ label: url, text: res.body });
  }

  const seen = new Set<string>();
  for (const source of sources) {
    for (const rule of SECRET_IN_BUNDLE) {
      rule.re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.re.exec(source.text)) !== null) {
        const value = match[0];
        // JWT는 anon key(정상)와 service_role(사고)을 반드시 구분한다.
        // 구분 없이 경고하면 Supabase 쓰는 모든 앱에서 오탐이 난다.
        if (value.startsWith("eyJ") && !isJwtServiceRole(value)) continue;
        if (seen.has(value)) continue;
        seen.add(value);
        findings.push({
          probe: `secret_in_bundle_${rule.title.slice(0, 20)}`,
          severity: rule.severity,
          title: rule.title,
          target: source.label,
          evidence: mask(value),
          advice: rule.advice,
        });
      }
    }
  }
  return findings;
}

async function probeOpenAdminPaths(baseUrl: string): Promise<ProbeFinding[]> {
  const findings: ProbeFinding[] = [];
  for (const path of ADMIN_PATHS) {
    const res = await safeGet(`${baseUrl}${path}`);
    if (!res || res.status !== 200) continue;

    // 로그인 화면이 뜨는 건 정상이다 — 그걸 경고하면 오탐이다.
    const looksLikeLogin = /로그인|login|sign in|sign-in|password|비밀번호|인증/i.test(res.body);
    if (looksLikeLogin) continue;
    // 내용이 거의 없으면 판단할 수 없으니 넘어간다.
    if (res.body.length < 500) continue;

    findings.push({
      probe: `open_admin${path.replace(/\//g, "_")}`,
      severity: "high",
      title: `${path} 가 로그인 없이 열립니다`,
      target: `${baseUrl}${path}`,
      evidence: "HTTP 200이고 로그인 화면으로 보이지 않습니다",
      advice:
        "관리자 화면이라면 지금 누구나 들어올 수 있는 상태입니다. 미들웨어에서 로그인 여부를 확인하도록 막으세요. 일반 사용자용 화면이라면 무시해도 됩니다.",
    });
  }
  return findings;
}

/** 디렉터리 목록이 그대로 열려 있는지. */
async function probeDirectoryListing(baseUrl: string): Promise<ProbeFinding[]> {
  const res = await safeGet(`${baseUrl}/uploads/`);
  if (!res || res.status !== 200) return [];
  if (!/Index of|Directory listing/i.test(res.body)) return [];
  return [
    {
      probe: "directory_listing",
      severity: "high",
      title: "업로드 폴더의 파일 목록이 그대로 보입니다",
      target: `${baseUrl}/uploads/`,
      evidence: "디렉터리 목록 페이지가 응답했습니다",
      advice: "다른 사람이 올린 파일까지 전부 볼 수 있는 상태입니다. 목록 노출을 끄세요.",
    },
  ];
}

export async function runSecurityProbes(baseUrl: string): Promise<ProbeFinding[]> {
  const normalized = baseUrl.replace(/\/+$/, "");

  // 순차로 돈다 — 남의 서비스에 동시에 여러 요청을 때리지 않는다.
  const groups = [
    await probeExposedFiles(normalized),
    await probeSecretsInBundle(normalized),
    await probeOpenAdminPaths(normalized),
    await probeSecurityHeaders(normalized),
    await probeDirectoryListing(normalized),
  ];

  const order: Record<ProbeSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return groups.flat().sort((a, b) => order[a.severity] - order[b.severity]);
}
