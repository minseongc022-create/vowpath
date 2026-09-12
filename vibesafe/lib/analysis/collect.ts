import "server-only";

import { createHash } from "node:crypto";
import { getFileContent, listTree, type GithubTreeEntry } from "../github/client";

/**
 * 저장소에서 "앱이 무엇인지"를 알아내는 데 꼭 필요한 것만 골라 담는다.
 *
 * ★ 저장소를 통째로 프롬프트에 넣지 않는 이유
 *
 * (1) 비용 — 중간 크기 Next.js 앱도 수백만 토큰이다. 검사마다 이러면 제품이
 *     성립하지 않는다.
 * (2) 품질 — 노이즈가 많을수록 모델이 핵심 흐름을 못 짚는다. 라우트 목록과
 *     인증 관련 파일 몇 개가 UI 컴포넌트 300개보다 훨씬 많은 걸 말해준다.
 * (3) 보안 — 우리가 읽은 건 로그·프롬프트를 타고 밖으로 나갈 수 있다. 적게
 *     읽는 게 제일 확실한 방어다.
 */

const MAX_FILES = 40;
const MAX_FILE_CHARS = 6_000;
const MAX_TOTAL_CHARS = 150_000;
const MAX_BLOB_BYTES = 200_000;

/** 아예 쳐다보지 않는 경로. */
const IGNORED_SEGMENTS = [
  "node_modules/", ".next/", "dist/", "build/", "coverage/", ".git/", "vendor/",
  "public/", "static/", ".vercel/", "__snapshots__/",
];

const IGNORED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".mp4", ".mp3", ".woff",
  ".woff2", ".ttf", ".eot", ".pdf", ".zip", ".lock", ".map", ".csv", ".xlsx",
];

/**
 * 우선순위. 앞에 있을수록 먼저 담는다.
 *
 * 라우트 파일(page/route)은 개수가 많아서 전부 넣으면 예산을 다 먹는다 —
 * 경로 목록은 따로 요약해서 넣고, 내용은 "인증/핵심으로 보이는" 것 위주로 담는다.
 */
type Rule = { test: (path: string) => boolean; weight: number };

const lower = (p: string) => p.toLowerCase();

const RULES: Rule[] = [
  { test: (p) => p === "package.json", weight: 100 },
  { test: (p) => /^(next\.config\.(ts|js|mjs)|middleware\.ts|middleware\.js)$/.test(p), weight: 95 },
  { test: (p) => /^(src\/)?middleware\.(ts|js)$/.test(p), weight: 95 },
  { test: (p) => p === "prisma/schema.prisma", weight: 88 },
  { test: (p) => /^\.env\.example$|^\.env\.sample$/.test(p), weight: 85 },
  { test: (p) => /supabase/.test(lower(p)) && /\.(ts|tsx|js|jsx|sql)$/.test(p), weight: 82 },
  { test: (p) => /(^|\/)(auth|login|signin|sign-in|signup|sign-up)[^/]*\.(ts|tsx|js|jsx)$/.test(lower(p)), weight: 80 },
  { test: (p) => /(^|\/)(auth|login|signup)\//.test(lower(p)) && /\.(ts|tsx)$/.test(p), weight: 78 },
  { test: (p) => /^(src\/)?app\/.*\/route\.(ts|js)$/.test(p), weight: 60 },
  { test: (p) => /^(src\/)?app\/.*\/page\.(tsx|jsx|ts|js)$/.test(p), weight: 58 },
  { test: (p) => /^(src\/)?pages\/api\/.*\.(ts|js)$/.test(p), weight: 56 },
  { test: (p) => /^(src\/)?pages\/.*\.(tsx|jsx)$/.test(p), weight: 54 },
  { test: (p) => /^(src\/)?app\/layout\.(tsx|jsx)$/.test(p), weight: 52 },
  { test: (p) => p === "README.md", weight: 50 },
  { test: (p) => /^(src\/)?(lib|utils|server)\/.*\.(ts|tsx)$/.test(p), weight: 30 },
];

function weightFor(path: string): number {
  for (const rule of RULES) if (rule.test(path)) return rule.weight;
  return 0;
}

function isIgnored(path: string): boolean {
  const p = lower(path);
  if (IGNORED_SEGMENTS.some((seg) => p.startsWith(seg) || p.includes(`/${seg}`))) return true;
  if (IGNORED_EXTENSIONS.some((ext) => p.endsWith(ext))) return true;
  return false;
}

export type CollectedFile = { path: string; content: string; truncated: boolean };

export type RepoDigest = {
  /** 분석 입력이 실제로 바뀌었는지 판단하는 값 — AppModel 캐시 키. */
  fingerprint: string;
  commitSha: string;
  files: CollectedFile[];
  /** 앱의 화면/API 주소 목록 — 내용 없이 경로만으로도 구조가 드러난다. */
  routes: { path: string; kind: "page" | "api" }[];
  dependencies: string[];
  totalRepoFiles: number;
  truncatedTree: boolean;
};

/** app/(group)/foo/[id]/page.tsx → /foo/:id */
function routeFromAppPath(path: string): string | null {
  const m = path.match(/^(?:src\/)?app\/(.*)\/(page|route)\.(tsx|ts|jsx|js)$/);
  if (!m) {
    if (/^(?:src\/)?app\/(page|route)\.(tsx|ts|jsx|js)$/.test(path)) return "/";
    return null;
  }
  const segments = m[1]
    .split("/")
    .filter((s) => !(s.startsWith("(") && s.endsWith(")"))) // 라우트 그룹은 URL에 안 나온다
    .filter((s) => !s.startsWith("@")) // 병렬 라우트
    .map((s) => (s.startsWith("[") ? `:${s.replace(/[[\]./]|\.\.\./g, "")}` : s));
  return `/${segments.join("/")}` || "/";
}

function routeFromPagesPath(path: string): string | null {
  const m = path.match(/^(?:src\/)?pages\/(.*)\.(tsx|ts|jsx|js)$/);
  if (!m) return null;
  const clean = m[1].replace(/\/index$/, "").replace(/^index$/, "");
  const segments = clean
    .split("/")
    .filter(Boolean)
    .map((s) => (s.startsWith("[") ? `:${s.replace(/[[\]./]|\.\.\./g, "")}` : s));
  return `/${segments.join("/")}`;
}

function extractRoutes(entries: GithubTreeEntry[]): { path: string; kind: "page" | "api" }[] {
  const out = new Map<string, "page" | "api">();
  for (const entry of entries) {
    if (entry.type !== "blob") continue;
    const p = entry.path;
    if (/^(?:src\/)?app\/.*route\.(ts|js)$/.test(p) || /^(?:src\/)?app\/route\.(ts|js)$/.test(p)) {
      const r = routeFromAppPath(p);
      if (r) out.set(r, "api");
    } else if (/^(?:src\/)?app\/.*page\.(tsx|ts|jsx|js)$/.test(p) || /^(?:src\/)?app\/page\.(tsx|jsx)$/.test(p)) {
      const r = routeFromAppPath(p);
      if (r) out.set(r, "page");
    } else if (/^(?:src\/)?pages\/api\//.test(p)) {
      const r = routeFromPagesPath(p);
      if (r) out.set(r, "api");
    } else if (/^(?:src\/)?pages\//.test(p) && /\.(tsx|jsx)$/.test(p) && !/_app|_document/.test(p)) {
      const r = routeFromPagesPath(p);
      if (r) out.set(r, "page");
    }
  }
  return [...out.entries()].map(([path, kind]) => ({ path, kind })).sort((a, b) => a.path.localeCompare(b.path));
}

function parseDependencies(packageJson: string | null): string[] {
  if (!packageJson) return [];
  try {
    const parsed = JSON.parse(packageJson) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return [...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})].sort();
  } catch {
    return [];
  }
}

export async function collectRepoDigest(params: {
  token: string;
  owner: string;
  repo: string;
  commitSha: string;
}): Promise<RepoDigest> {
  const { token, owner, repo, commitSha } = params;
  const tree = await listTree(token, owner, repo, commitSha);

  const candidates = tree.entries
    .filter((e) => e.type === "blob" && !isIgnored(e.path) && e.size <= MAX_BLOB_BYTES)
    .map((e) => ({ entry: e, weight: weightFor(e.path) }))
    .filter((c) => c.weight > 0)
    // 같은 무게면 경로가 짧은 쪽(= 더 상위 = 더 중요한 경향)을 먼저.
    .sort((a, b) => b.weight - a.weight || a.entry.path.length - b.entry.path.length);

  const picked = candidates.slice(0, MAX_FILES);

  const files: CollectedFile[] = [];
  let totalChars = 0;
  for (const candidate of picked) {
    if (totalChars >= MAX_TOTAL_CHARS) break;
    const content = await getFileContent(token, owner, repo, candidate.entry.path, commitSha);
    if (content === null) continue;
    const truncated = content.length > MAX_FILE_CHARS;
    const body = truncated ? `${content.slice(0, MAX_FILE_CHARS)}\n… (이하 생략)` : content;
    totalChars += body.length;
    files.push({ path: candidate.entry.path, content: body, truncated });
  }

  const packageJson = files.find((f) => f.path === "package.json")?.content ?? null;

  // 지문은 **내용 해시가 아니라 blob sha**로 만든다 — 내용을 다시 받지 않고도
  // 바뀌었는지 알 수 있어 캐시 판정이 API 호출 한 번으로 끝난다.
  const fingerprint = createHash("sha256")
    .update(picked.map((c) => `${c.entry.path}:${c.entry.sha}`).sort().join("\n"))
    .digest("hex");

  return {
    fingerprint,
    commitSha,
    files,
    routes: extractRoutes(tree.entries),
    dependencies: parseDependencies(packageJson),
    totalRepoFiles: tree.entries.filter((e) => e.type === "blob").length,
    truncatedTree: tree.truncated,
  };
}

/** 프롬프트에 넣을 텍스트. 파일 사이 경계를 분명히 해서 모델이 섞지 않게 한다. */
export function renderDigestForPrompt(digest: RepoDigest): string {
  const parts: string[] = [];

  parts.push(`## 저장소 라우트 (${digest.routes.length}개)`);
  parts.push(
    digest.routes.length
      ? digest.routes.map((r) => `- [${r.kind}] ${r.path}`).join("\n")
      : "- (Next.js 라우트 규약에 맞는 파일을 찾지 못함)",
  );

  parts.push(`\n## 주요 의존성 (${digest.dependencies.length}개)`);
  parts.push(digest.dependencies.slice(0, 80).join(", ") || "(package.json 없음)");

  parts.push(`\n## 파일 내용 (${digest.files.length}개 선별)`);
  for (const file of digest.files) {
    parts.push(`\n=== FILE: ${file.path} ===\n${file.content}`);
  }

  return parts.join("\n");
}
