import type { CollectedFile } from "./collect";

/**
 * 저장소 분석 중 눈에 띄는 명백한 위험만 표시한다.
 *
 * ★ 이건 보안 스캐너가 아니다
 *
 * 목적은 "바이브코딩으로 만든 앱에서 실제로 자주 나는 사고 몇 가지"를 짚어주는
 * 것이다. 그중 압도적 1위가 **서버 전용 키를 브라우저로 내보내는 것**이다
 * (특히 Supabase service_role — 이 키 하나면 RLS를 우회해 전체 DB를 읽고 쓴다).
 *
 * ★ 값은 저장하지 않는다
 *
 * evidence에는 마스킹한 흔적과 위치만 담는다. 남의 키를 우리 DB에 모아두면
 * 이 서비스 자체가 제일 값진 표적이 된다.
 */

export type SecurityFinding = {
  severity: "high" | "medium" | "low";
  rule: string;
  title: string;
  filePath: string;
  line: number | null;
  evidence: string;
  advice: string;
};

function mask(value: string): string {
  const v = value.trim();
  if (v.length <= 10) return `${v.slice(0, 2)}${"•".repeat(Math.max(v.length - 2, 3))}`;
  return `${v.slice(0, 6)}…${"•".repeat(6)}…${v.slice(-2)}`;
}

/** 파일이 브라우저로 내려가는 코드인가. */
function isClientReachable(path: string, content: string): boolean {
  if (/^["']use client["']/m.test(content)) return true;
  if (/^(src\/)?(components|app)\/.*\.(tsx|jsx)$/.test(path)) {
    // app router의 서버 컴포넌트일 수도 있지만, "use server"가 없고 브라우저
    // API를 쓰면 클라이언트로 본다. 애매하면 경고하는 쪽이 낫다.
    return /\b(useState|useEffect|onClick|window\.|document\.)/.test(content);
  }
  if (/^(src\/)?pages\/(?!api\/).*\.(tsx|jsx)$/.test(path)) return true;
  return false;
}

type Rule = {
  id: string;
  severity: SecurityFinding["severity"];
  title: string;
  advice: string;
  re: RegExp;
  /** 브라우저로 내려가는 파일에서만 문제인가 */
  clientOnly?: boolean;
};

const RULES: Rule[] = [
  {
    id: "supabase_service_role_public",
    severity: "high",
    title: "Supabase service_role 키가 브라우저로 노출될 수 있습니다",
    advice:
      "service_role 키는 RLS를 무시하고 DB 전체를 읽고 쓸 수 있습니다. NEXT_PUBLIC_ 접두사를 떼고 서버 코드에서만 사용하세요. 이미 노출됐다면 Supabase 대시보드에서 키를 즉시 재발급하세요.",
    re: /NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE[A-Z_]*/g,
  },
  {
    id: "service_role_literal",
    severity: "high",
    title: "service_role 키로 보이는 값이 코드에 직접 적혀 있습니다",
    advice:
      "키를 코드에 넣지 말고 서버 환경변수로 옮기세요. 저장소에 한 번이라도 올라간 키는 재발급해야 합니다.",
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    id: "openai_key_literal",
    severity: "high",
    title: "AI API 키로 보이는 값이 코드에 직접 적혀 있습니다",
    advice: "키를 환경변수로 옮기고, 노출된 키는 즉시 폐기·재발급하세요.",
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "anthropic_key_literal",
    severity: "high",
    title: "Anthropic API 키로 보이는 값이 코드에 직접 적혀 있습니다",
    advice: "키를 환경변수로 옮기고, 노출된 키는 즉시 폐기·재발급하세요.",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "github_token_literal",
    severity: "high",
    title: "GitHub 토큰으로 보이는 값이 코드에 직접 적혀 있습니다",
    advice: "토큰을 즉시 폐기하고 환경변수로 옮기세요.",
    re: /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{30,}\b/g,
  },
  {
    id: "private_env_in_client",
    severity: "medium",
    title: "브라우저 코드에서 서버 전용 환경변수를 읽고 있습니다",
    advice:
      "NEXT_PUBLIC_ 없는 환경변수는 브라우저에서 값이 비어 있습니다. 이 코드는 동작하지 않거나, 빌드 설정에 따라 값이 번들에 박힐 수 있습니다. 서버 라우트로 옮기세요.",
    re: /process\.env\.(?!NEXT_PUBLIC_)([A-Z][A-Z0-9_]{3,})/g,
    clientOnly: true,
  },
  {
    id: "dangerous_public_endpoint",
    severity: "medium",
    title: "인증 검사가 보이지 않는 쓰기 API가 있습니다",
    advice:
      "누구나 호출할 수 있는 주소에서 데이터를 만들거나 지우고 있지 않은지 확인하세요. 로그인·권한 확인을 추가하는 것이 좋습니다.",
    re: /__never_matches__/g, // 아래에서 별도로 처리한다
  },
];

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

/** 쓰기 API 라우트에 인증 흔적이 전혀 없는지 — 정규식 하나로 판단할 수 없어 따로 본다. */
function scanUnauthenticatedWriteRoute(file: CollectedFile): SecurityFinding | null {
  const isApiRoute =
    /^(src\/)?app\/.*\/route\.(ts|js)$/.test(file.path) || /^(src\/)?pages\/api\//.test(file.path);
  if (!isApiRoute) return null;

  const hasWrite = /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/.test(file.content);
  if (!hasWrite) return null;

  const hasAuthSignal =
    /auth\(|getSession|getServerSession|currentUser|requireUser|requireAuth|verify(Token|Session|Jwt)|cookies\(\)|getUser\(|session\b/i.test(
      file.content,
    );
  if (hasAuthSignal) return null;

  return {
    severity: "medium",
    rule: "dangerous_public_endpoint",
    title: "인증 검사가 보이지 않는 쓰기 API가 있습니다",
    filePath: file.path,
    line: null,
    evidence: "POST/PUT/PATCH/DELETE 처리부에서 로그인·세션 확인 코드를 찾지 못했습니다.",
    advice:
      "누구나 호출할 수 있는 주소에서 데이터가 바뀌지 않는지 확인하세요. 로그인·권한 확인을 추가하는 것이 좋습니다.",
  };
}

export function scanForSecurityIssues(files: CollectedFile[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    // .env.example은 자리표시자만 있는 파일이라 키 검사에서 뺀다 — 여기서
    // 잡으면 정상적인 저장소마다 오탐이 뜬다.
    const isEnvExample = /^\.env\.(example|sample|template)$/.test(file.path);
    const clientReachable = isClientReachable(file.path, file.content);

    for (const rule of RULES) {
      if (rule.id === "dangerous_public_endpoint") continue;
      if (rule.clientOnly && !clientReachable) continue;
      if (isEnvExample && rule.id !== "supabase_service_role_public") continue;

      rule.re.lastIndex = 0;
      let match: RegExpExecArray | null;
      let hitsForRule = 0;
      while ((match = rule.re.exec(file.content)) !== null && hitsForRule < 3) {
        hitsForRule += 1;
        const line = lineOf(file.content, match.index);
        const key = `${rule.id}:${file.path}:${line}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          severity: rule.severity,
          rule: rule.id,
          title: rule.title,
          filePath: file.path,
          line,
          evidence: mask(match[0]),
          advice: rule.advice,
        });
      }
    }

    const routeFinding = scanUnauthenticatedWriteRoute(file);
    if (routeFinding) {
      const key = `${routeFinding.rule}:${routeFinding.filePath}:0`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push(routeFinding);
      }
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 40);
}
