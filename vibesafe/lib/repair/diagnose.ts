import "server-only";

import { getAiProvider } from "../ai";
import { prisma } from "../db";
import { compareCommits, getFileContent, type CommitSummary } from "../github/client";
import { resolveAccessToken } from "../github/connection";
import { logAction, requirePermission } from "../permissions";
import { consumeUsage } from "../usage";

/**
 * 원인 진단.
 *
 * ★ "고쳐준다"의 신뢰는 여기서 갈린다
 *
 * 근거 없이 코드를 고쳐 놓으면 사용자는 그 PR을 열어보지도 않는다. 반대로
 * "지난주 화요일까지는 됐고, 그 뒤 들어온 커밋 3개 중 이것이 로그인 폼의
 * 라벨을 바꿨습니다"까지 말해주면, 고칠 코드가 없어도 그 자체로 값이 있다.
 *
 * 그래서 진단을 수정과 분리했다. 진단만 켜고 수정은 안 켜도 쓸모가 있어야
 * 사용자가 첫 단계를 열어준다.
 */

const MAX_FILES_TO_READ = 6;
const MAX_FILE_CHARS = 4_000;

export type Suspect = {
  sha: string;
  message: string;
  author: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  files: string[];
};

export type DiagnosisResult = {
  diagnosisId: string;
  summary: string;
  suspects: Suspect[];
  suggestion: string | null;
  commitsScanned: number;
};

const DIAGNOSIS_SYSTEM = `당신은 웹 앱의 회귀(regression) 원인을 찾는 디버깅 전문가입니다.

어떤 앱의 핵심 기능이 브라우저 검사에서 실패했습니다. 마지막으로 정상이었던
시점 이후 저장소에 들어온 커밋 목록과, 관련 있어 보이는 파일 내용 일부를 드립니다.

당신의 일:
1. 어느 커밋이 원인일 가능성이 높은지 순위를 매긴다.
2. 왜 그렇게 보는지 한 문장으로 설명한다.
3. 고칠 방향을 제안한다(코드를 직접 쓰라는 게 아니라 무엇을 바꿔야 하는지).

## 판단 기준
- 실패한 단계가 찾지 못한 요소와, 커밋이 건드린 파일이 겹치는가
- 라벨·버튼 텍스트·경로가 바뀌었는가 (검사가 화면의 글자로 요소를 찾으므로
  텍스트 변경은 실패의 흔한 원인이다)
- 인증·미들웨어·리다이렉트가 바뀌었는가
- 단순 스타일·문서 변경은 원인일 가능성이 낮다

## 중요
- 확신이 없으면 confidence를 "low"로 하고 솔직히 모르겠다고 쓰세요.
  틀린 확신은 도움이 안 되는 정도가 아니라 사용자를 엉뚱한 곳으로 보냅니다.
- 커밋 목록에 없는 sha를 지어내지 마세요.
- 검사 자체가 잘못됐을 가능성(앱은 정상인데 흐름 정의가 낡음)도 후보로 고려하고,
  그렇게 보이면 summary에 그렇게 쓰세요.

한국어로 답하세요.`;

const DIAGNOSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "한 문장 요약 (한국어)" },
    testMayBeStale: {
      type: "boolean",
      description: "앱이 아니라 검사 흐름 정의가 낡아서 실패했을 가능성이 높은가",
    },
    suspects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sha: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          reason: { type: "string" },
        },
        required: ["sha", "confidence", "reason"],
        additionalProperties: false,
      },
    },
    suggestion: { type: "string", description: "무엇을 어떻게 바꾸면 되는지" },
  },
  required: ["summary", "testMayBeStale", "suspects", "suggestion"],
  additionalProperties: false,
} as const;

type DiagnosisResponse = {
  summary: string;
  testMayBeStale: boolean;
  suspects: { sha: string; confidence: string; reason: string }[];
  suggestion: string;
};

export class DiagnosisError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DiagnosisError";
  }
}

/** 커밋이 건드린 파일 중 실패와 관련 있어 보이는 것부터 읽는다. */
function rankFilesForReading(commits: CommitSummary[], failedStep: string): string[] {
  const seen = new Map<string, number>();
  const hint = failedStep.toLowerCase();

  for (const commit of commits) {
    for (const file of commit.files) {
      const path = file.path.toLowerCase();
      if (/\.(md|txt|lock|json|svg|png|jpg|css)$/.test(path)) continue;
      let score = file.additions + file.deletions;
      // 실패 단계 문구와 파일 경로가 겹치면 가산점 (로그인 실패 → auth/login 파일)
      for (const word of ["login", "auth", "signup", "signin", "middleware", "layout", "page"]) {
        if (path.includes(word) && hint.includes(word)) score += 500;
      }
      if (/middleware|auth|login/.test(path)) score += 100;
      seen.set(file.path, Math.max(seen.get(file.path) ?? 0, score));
    }
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_FILES_TO_READ)
    .map(([path]) => path);
}

export async function diagnoseIncident(params: {
  userId: string;
  projectId: string;
  incidentId: string;
}): Promise<DiagnosisResult> {
  const { userId, projectId, incidentId } = params;
  await requirePermission(projectId, "diagnose");

  const incident = await prisma.vibesafeIncident.findFirst({
    where: { id: incidentId, projectId },
  });
  if (!incident) throw new DiagnosisError("장애를 찾을 수 없습니다.", "NOT_FOUND");

  const project = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId },
    include: { repository: true },
  });
  if (!project?.repository) throw new DiagnosisError("저장소가 연결되어 있지 않습니다.", "NO_REPO");

  // 마지막 정상 시점 = baseline이 기록한 커밋. 여기부터 지금까지가 용의 선상이다.
  const baseline = await prisma.vibesafeFlowBaseline.findUnique({
    where: { projectId_flowKey: { projectId, flowKey: incident.flowKey } },
    select: { commitSha: true },
  });
  const failingRun = await prisma.vibesafeTestRun.findUnique({
    where: { id: incident.lastRunId },
    select: { commitSha: true },
  });

  const fromSha = baseline?.commitSha ?? null;
  const toSha = failingRun?.commitSha ?? project.repository.lastAnalyzedSha ?? null;

  if (!fromSha || !toSha) {
    throw new DiagnosisError(
      "비교할 커밋 정보가 없습니다. 코드 변경 이벤트(webhook)를 연결하면 원인 범위를 좁힐 수 있습니다.",
      "NO_COMMIT_RANGE",
    );
  }
  if (fromSha === toSha) {
    throw new DiagnosisError(
      "마지막 정상 시점 이후 코드 변경이 없습니다. 앱이 아니라 외부 서비스나 데이터 쪽 문제일 수 있습니다.",
      "NO_CHANGES",
    );
  }

  const token = await resolveAccessToken(userId);
  const repo = project.repository;

  const comparison = await compareCommits(token, repo.owner, repo.repo, fromSha, toSha);
  if (comparison.commits.length === 0) {
    throw new DiagnosisError("두 시점 사이에 커밋이 없습니다.", "NO_CHANGES");
  }

  const failedStep = incident.failedStepDescription ?? "";
  const filesToRead = rankFilesForReading(comparison.commits, failedStep);
  const fileContents: { path: string; content: string }[] = [];
  for (const path of filesToRead) {
    const content = await getFileContent(token, repo.owner, repo.repo, path, toSha);
    if (content) fileContents.push({ path, content: content.slice(0, MAX_FILE_CHARS) });
  }

  await consumeUsage(userId, "ai_analyses", 1);
  const provider = getAiProvider();

  const userPrompt = [
    `## 실패한 기능\n${incident.flowTitle}`,
    `## 실패한 단계\n${failedStep || "(기록 없음)"}`,
    `## 오류 메시지\n${(incident.errorMessage ?? "(없음)").slice(0, 1500)}`,
    `## 마지막 정상 커밋\n${fromSha.slice(0, 12)}`,
    `## 실패 시점 커밋\n${toSha.slice(0, 12)}`,
    `## 그 사이 커밋 ${comparison.commits.length}개${comparison.truncated ? " (일부 생략됨)" : ""}`,
    comparison.commits
      .map(
        (c) =>
          `- ${c.sha.slice(0, 12)} ${c.message} (${c.author})\n` +
          (c.files.length ? `  파일: ${c.files.map((f) => `${f.path}(+${f.additions}/-${f.deletions})`).join(", ")}` : "  파일: (목록 없음)"),
      )
      .join("\n"),
    fileContents.length
      ? `## 관련 파일 현재 내용\n${fileContents.map((f) => `=== ${f.path} ===\n${f.content}`).join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await provider.generateJson<DiagnosisResponse>({
    system: DIAGNOSIS_SYSTEM,
    user: userPrompt,
    schema: DIAGNOSIS_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "vibesafe_diagnosis",
    maxOutputTokens: 3000,
  });

  // AI가 지어낸 sha는 버린다 — 목록에 없는 커밋을 가리키면 사용자가 확인할 수 없다.
  const knownShas = new Map(comparison.commits.map((c) => [c.sha, c]));
  const suspects: Suspect[] = [];
  for (const raw of response.suspects ?? []) {
    const match =
      knownShas.get(raw.sha) ??
      comparison.commits.find((c) => c.sha.startsWith(raw.sha.slice(0, 7)));
    if (!match) continue;
    suspects.push({
      sha: match.sha,
      message: match.message,
      author: match.author,
      confidence: (["high", "medium", "low"] as const).includes(raw.confidence as "high")
        ? (raw.confidence as Suspect["confidence"])
        : "low",
      reason: raw.reason.slice(0, 400),
      files: match.files.map((f) => f.path).slice(0, 10),
    });
  }

  const summary = response.testMayBeStale
    ? `${response.summary} (앱이 아니라 검사 흐름 정의가 낡았을 가능성이 있습니다)`
    : response.summary;

  const saved = await prisma.vibesafeDiagnosis.create({
    data: {
      projectId,
      incidentId,
      fromSha,
      toSha,
      summary: summary.slice(0, 1000),
      suspects: suspects as unknown as object,
      suggestion: response.suggestion?.slice(0, 2000) ?? null,
      provider: provider.id,
    },
    select: { id: true },
  });

  await logAction({
    projectId,
    action: "diagnosis",
    summary: `"${incident.flowTitle}" 실패 원인을 분석했습니다 — 후보 ${suspects.length}건`,
    detail: { incidentId, commitsScanned: comparison.commits.length },
    incidentId,
  });

  return {
    diagnosisId: saved.id,
    summary,
    suspects,
    suggestion: response.suggestion ?? null,
    commitsScanned: comparison.commits.length,
  };
}
