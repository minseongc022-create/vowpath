import "server-only";

import { getAiProvider } from "../ai";
import { prisma } from "../db";
import {
  createBranch,
  getFileContent,
  getFileSha,
  getHeadSha,
  openPullRequest,
  putFile,
} from "../github/client";
import { resolveAccessToken } from "../github/connection";
import { resolveWriteToken } from "../github/write-connection";
import { logAction, requirePermission } from "../permissions";
import { consumeUsage } from "../usage";
import type { Suspect } from "./diagnose";
import { buildFileDiff } from "./diff";
import { assessRepairRisk } from "./risk";

/**
 * 수정안을 만들어 PR로 올린다.
 *
 * ★ 여기서 지키는 세 가지
 *
 * 1. 기본 브랜치에 직접 쓰지 않는다. 항상 새 브랜치 → PR.
 *    사람이 diff를 보고 머지한다. 이게 "자동 수정"과 "자동 파괴"를 가르는 선이다.
 * 2. AI가 파일을 통째로 새로 쓰게 하지 않는다. 고칠 파일의 현재 내용을 주고
 *    **전체 내용을 다시 받되**, 원본과 너무 많이 다르면(절반 이상) 거절한다.
 *    "로그인 버튼 텍스트 한 줄"을 고쳐달라고 했는데 파일이 통째로 바뀌어 오는
 *    일이 실제로 일어난다.
 * 3. 건드릴 수 있는 파일을 제한한다. 설정·워크플로·의존성·비밀 파일은
 *    자동 수정 대상이 아니다.
 */

const MAX_FILES_PER_FIX = 3;
const MAX_FILE_CHARS = 12_000;

/** 자동 수정이 절대 건드리지 않는 파일. */
const FORBIDDEN_PATTERNS = [
  /^\.github\//,                       // 워크플로를 고치면 CI를 우회할 수 있다
  /^\.env/,                            // 비밀
  /package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$/, // 잠금 파일은 도구로만
  /^package\.json$/,                   // 의존성 변경은 사람이
  /^prisma\/migrations\//,             // 마이그레이션은 되돌리기 어렵다
  /^\.git/,
  /vercel\.json$|next\.config\./,      // 배포 설정
];

export function isEditable(path: string): boolean {
  if (FORBIDDEN_PATTERNS.some((re) => re.test(path))) return false;
  return /\.(ts|tsx|js|jsx|css|scss|md)$/.test(path);
}

const FIX_SYSTEM = `당신은 웹 앱의 회귀를 고치는 개발자입니다.

어떤 기능이 깨졌고, 원인 분석 결과와 관련 파일의 **현재 전체 내용**을 드립니다.
고쳐야 할 파일의 **전체 내용을 고친 상태로** 돌려주세요.

## 반드시 지킬 것
- 문제를 고치는 **최소한의 변경**만 하세요. 리팩터링·정리·스타일 개선을 하지 마세요.
  리뷰어가 diff를 보고 5초 안에 이해할 수 있어야 합니다.
- 파일 전체를 돌려주되, 고친 줄 외에는 **한 글자도 바꾸지 마세요**
  (들여쓰기, 따옴표 스타일, 빈 줄 포함).
- 무엇을 왜 바꿨는지 한국어로 설명하세요.
- 고칠 방법이 확실하지 않으면 changes를 빈 배열로 두고 그 이유를 설명하세요.
  **틀린 수정은 안 고치느니만 못합니다.**
- 새 의존성을 추가하지 마세요.
- 주어진 파일 목록에 없는 파일을 만들거나 고치지 마세요.

## 흔한 경우
- 검사가 "로그인 버튼"을 못 찾음 → 버튼 텍스트가 바뀌었을 수 있다.
  이때 **앱을 고치는 게 맞는지, 검사 흐름을 고치는 게 맞는지** 판단하세요.
  앱이 의도적으로 바뀐 거라면 앱을 되돌리지 말고, changes를 비우고
  "검사 흐름의 선택자를 새 텍스트로 바꾸세요"라고 설명하세요.`;

const FIX_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "PR 제목 (한국어, 50자 이내)" },
    explanation: { type: "string", description: "무엇을 왜 바꿨는지 (한국어)" },
    fixesAppCode: {
      type: "boolean",
      description: "앱 코드를 고치는 게 맞는가. false면 검사 흐름 쪽을 고쳐야 한다는 뜻",
    },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          newContent: { type: "string", description: "고친 뒤의 파일 전체 내용" },
          whatChanged: { type: "string", description: "이 파일에서 바꾼 것 한 줄" },
        },
        required: ["path", "newContent", "whatChanged"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "explanation", "fixesAppCode", "changes"],
  additionalProperties: false,
} as const;

type FixResponse = {
  title: string;
  explanation: string;
  fixesAppCode: boolean;
  changes: { path: string; newContent: string; whatChanged: string }[];
};

export class FixError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "FixError";
  }
}

/** 변경량이 과한지 — "한 줄 고쳐줘"에 파일이 통째로 바뀌어 오는 걸 거른다. */
export function changeIsReasonable(before: string, after: string): boolean {
  if (after.trim().length === 0) return false;
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  // 줄 수가 절반 이하로 줄거나 두 배 이상 늘면 최소 변경이 아니다.
  if (afterLines.length < beforeLines.length * 0.5) return false;
  if (afterLines.length > beforeLines.length * 2 + 20) return false;

  const beforeSet = new Set(beforeLines.map((l) => l.trim()).filter(Boolean));
  const changed = afterLines.filter((l) => l.trim() && !beforeSet.has(l.trim())).length;
  // 전체 줄의 30%를 넘게 바꿨으면 최소 변경이 아니다.
  return changed <= Math.max(10, Math.floor(afterLines.length * 0.3));
}

export type FixProposalResult = {
  proposalId: string;
  status: "opened" | "draft";
  title: string;
  explanation: string;
  prUrl: string | null;
  changedFiles: string[];
  /** 앱이 아니라 검사 흐름을 고쳐야 한다고 판단한 경우 */
  suggestsFlowUpdate: boolean;
  riskLevel: "low" | "medium" | "high";
  riskReason: string;
};

export async function proposeFix(params: {
  userId: string;
  projectId: string;
  diagnosisId: string;
}): Promise<FixProposalResult> {
  const { userId, projectId, diagnosisId } = params;
  await requirePermission(projectId, "proposePr");

  const diagnosis = await prisma.vibesafeDiagnosis.findFirst({
    where: { id: diagnosisId, projectId },
  });
  if (!diagnosis) throw new FixError("진단 결과를 찾을 수 없습니다.", "NOT_FOUND");

  const incident = diagnosis.incidentId
    ? await prisma.vibesafeIncident.findUnique({ where: { id: diagnosis.incidentId } })
    : null;

  const project = await prisma.vibesafeProject.findFirst({
    where: { id: projectId, userId },
    include: { repository: true },
  });
  if (!project?.repository) throw new FixError("저장소가 연결되어 있지 않습니다.", "NO_REPO");
  const repo = project.repository;

  // 읽기는 읽기 연결로, 쓰기는 쓰기 연결로. 섞지 않는다.
  const readToken = await resolveAccessToken(userId);
  let writeToken: string;
  try {
    writeToken = await resolveWriteToken(userId);
  } catch {
    throw new FixError(
      "수정 권한이 있는 GitHub 연결이 없습니다. 계정 화면에서 '수정 권한 연결'을 추가해주세요.",
      "NO_WRITE_CONNECTION",
    );
  }

  const suspects = (diagnosis.suspects as unknown as Suspect[]) ?? [];
  const candidatePaths = [...new Set(suspects.flatMap((s) => s.files))]
    .filter(isEditable)
    .slice(0, MAX_FILES_PER_FIX);

  if (candidatePaths.length === 0) {
    throw new FixError(
      "자동으로 고칠 수 있는 파일을 찾지 못했습니다. 설정·의존성·워크플로 파일은 자동 수정 대상이 아닙니다.",
      "NO_EDITABLE_FILES",
    );
  }

  const headSha = await getHeadSha(readToken, repo.owner, repo.repo, repo.defaultBranch);
  if (!headSha) throw new FixError("기본 브랜치를 읽지 못했습니다.", "NO_HEAD");

  const originals: { path: string; content: string }[] = [];
  for (const path of candidatePaths) {
    const content = await getFileContent(readToken, repo.owner, repo.repo, path, headSha);
    if (content && content.length <= MAX_FILE_CHARS) originals.push({ path, content });
  }
  if (originals.length === 0) {
    throw new FixError("고칠 파일을 읽지 못했거나 파일이 너무 큽니다.", "FILES_UNREADABLE");
  }

  await consumeUsage(userId, "ai_analyses", 1);
  const provider = getAiProvider();

  const response = await provider.generateJson<FixResponse>({
    system: FIX_SYSTEM,
    user: [
      `## 깨진 기능\n${incident?.flowTitle ?? "(알 수 없음)"}`,
      `## 실패한 단계\n${incident?.failedStepDescription ?? "(기록 없음)"}`,
      `## 오류\n${(incident?.errorMessage ?? "").slice(0, 1000)}`,
      `## 원인 분석\n${diagnosis.summary}\n\n${diagnosis.suggestion ?? ""}`,
      `## 고칠 수 있는 파일 (이 목록 밖은 건드리지 마세요)`,
      originals.map((f) => `=== ${f.path} ===\n${f.content}`).join("\n\n"),
    ].join("\n\n"),
    schema: FIX_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "vibesafe_fix",
    maxOutputTokens: 16000,
  });

  const originalByPath = new Map(originals.map((f) => [f.path, f.content]));
  const accepted: { path: string; before: string; after: string; whatChanged: string }[] = [];
  const rejected: string[] = [];

  for (const change of response.changes ?? []) {
    const before = originalByPath.get(change.path);
    if (!before) {
      rejected.push(`${change.path} (목록에 없는 파일)`);
      continue;
    }
    if (!isEditable(change.path)) {
      rejected.push(`${change.path} (수정 금지 대상)`);
      continue;
    }
    if (change.newContent === before) continue;
    if (!changeIsReasonable(before, change.newContent)) {
      rejected.push(`${change.path} (변경 범위가 지나치게 큼)`);
      continue;
    }
    accepted.push({
      path: change.path,
      before,
      after: change.newContent,
      whatChanged: change.whatChanged,
    });
  }

  // 같은 장애에 대한 몇 번째 시도인가 — 두 번째부터는 위험도가 올라간다.
  // 한 번 틀린 진단으로 두 번째 수정을 만들고 있다면, 원인을 잘못 짚었을
  // 가능성이 첫 번째보다 크기 때문이다.
  const previous = diagnosis.incidentId
    ? await prisma.vibesafeFixProposal.findFirst({
        where: { projectId, incidentId: diagnosis.incidentId },
        orderBy: { attempt: "desc" },
        select: { id: true, attempt: true, status: true },
      })
    : null;
  const attempt = (previous?.attempt ?? 0) + 1;

  // 진단이 원인을 얼마나 확신했는지.
  //
  // 진단은 high/medium/low로 말하고 위험도 계산은 숫자를 쓴다. 그 사이를
  // 옮기는 표다 — **없는 정보를 만들지 않고**, 진단이 말한 단계를 그대로
  // 옮길 뿐이다. 후보가 아예 없으면 null로 둔다. 모르는 것을 0.5로 채우면
  // "반반 확신"이라는, 아무도 말한 적 없는 정보가 생긴다.
  const CONFIDENCE_VALUE: Record<string, number> = { high: 0.85, medium: 0.6, low: 0.3 };
  const confidences = suspects
    .map((suspect) => CONFIDENCE_VALUE[suspect.confidence])
    .filter((value): value is number => typeof value === "number");
  const confidence = confidences.length ? Math.max(...confidences) : null;

  const flow = incident
    ? await prisma.vibesafeCriticalFlow.findUnique({
        where: { projectId_key: { projectId, key: incident.flowKey } },
        select: { riskLevel: true },
      })
    : null;

  const risk = assessRepairRisk({
    files: accepted.map((c) => ({ path: c.path, before: c.before, after: c.after })),
    confidence,
    flowRiskLevel: flow?.riskLevel ?? null,
    attempt,
  });

  // diff를 저장해둔다 — 사용자가 [적용하기]를 누르기 전에 **무엇이 바뀌는지**
  // 직접 볼 수 있어야 한다. 파일 전체를 두 벌 보관하지 않으려고 변경 주변만
  // 잘라서 넣는다.
  const changeRecords = accepted.map((c) => ({
    path: c.path,
    whatChanged: c.whatChanged,
    diff: buildFileDiff(c.path, c.before, c.after),
  }));

  const proposal = await prisma.vibesafeFixProposal.create({
    data: {
      projectId,
      diagnosisId,
      incidentId: diagnosis.incidentId,
      kind: "code_pr",
      status: "draft",
      title: response.title.slice(0, 200),
      rationale: [
        response.explanation,
        rejected.length ? `\n거른 변경: ${rejected.join(", ")}` : "",
      ].join("").slice(0, 4000),
      changes: changeRecords as unknown as object,
      riskLevel: risk.level,
      riskReason: [risk.reason, ...risk.signals].join(" · ").slice(0, 1000),
      confidence,
      attempt,
      parentProposalId: previous?.id ?? null,
    },
    select: { id: true },
  });

  // 앞선 제안은 더 이상 유효하지 않다 — 적용 버튼이 두 개 살아 있으면
  // 사용자가 옛 수정을 적용할 수 있다.
  if (previous && ["draft", "proposed", "opened", "verifying", "ready_to_apply", "needs_human"].includes(previous.status)) {
    await prisma.vibesafeFixProposal.update({
      where: { id: previous.id },
      data: { status: "superseded" },
    });
  }

  // 앱이 아니라 검사 흐름을 고쳐야 하는 경우 — PR을 열지 않고 알려만 준다.
  if (!response.fixesAppCode || accepted.length === 0) {
    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: { status: "proposed" },
    });
    await logAction({
      projectId,
      action: "diagnosis",
      summary: response.fixesAppCode
        ? "수정안을 만들지 못했습니다 — 안전하게 고칠 방법을 찾지 못함"
        : "앱이 아니라 검사 흐름을 고쳐야 한다고 판단했습니다",
      detail: { proposalId: proposal.id },
      incidentId: diagnosis.incidentId,
    });
    return {
      proposalId: proposal.id,
      status: "draft",
      title: response.title,
      explanation: response.explanation,
      prUrl: null,
      changedFiles: [],
      suggestsFlowUpdate: !response.fixesAppCode,
      riskLevel: risk.level,
      riskReason: risk.reason,
    };
  }

  // 여기서부터 실제로 GitHub에 쓴다.
  const branchName = `vibesafe/fix-${proposal.id.slice(-8)}`;
  try {
    await createBranch(writeToken, repo.owner, repo.repo, branchName, headSha);

    for (const change of accepted) {
      const sha = await getFileSha(writeToken, repo.owner, repo.repo, change.path, branchName);
      await putFile(writeToken, repo.owner, repo.repo, {
        path: change.path,
        content: change.after,
        message: `fix: ${change.whatChanged}`.slice(0, 200),
        branch: branchName,
        sha: sha ?? undefined,
      });
    }

    const body = [
      `## VibeSafe가 발견한 문제`,
      `**${incident?.flowTitle ?? "핵심 기능"}** 이 정상 작동하지 않았습니다.`,
      incident?.failedStepDescription ? `\n실패한 단계: ${incident.failedStepDescription}` : "",
      `\n## 원인 분석\n${diagnosis.summary}`,
      `\n## 이 PR이 바꾸는 것\n${response.explanation}`,
      `\n${accepted.map((c) => `- \`${c.path}\` — ${c.whatChanged}`).join("\n")}`,
      rejected.length ? `\n### 자동으로 적용하지 않은 변경\n${rejected.map((r) => `- ${r}`).join("\n")}` : "",
      `\n## 위험도: ${risk.level.toUpperCase()}`,
      `${risk.reason}`,
      risk.signals.length ? risk.signals.map((sig) => `- ${sig}`).join("\n") : "",
      `\n## 다음 단계`,
      `이 브랜치의 프리뷰 배포가 올라오면 VibeSafe가 **깨졌던 기능과 나머지 핵심 기능을 실제 브라우저로 다시 확인**합니다.`,
      `확인을 통과하면 VibeSafe 화면에 [수정 적용하기] 버튼이 생깁니다. 통과하지 못하면 버튼은 생기지 않습니다.`,
      `\n---`,
      `이 PR은 VibeSafe가 자동으로 만들었습니다. 여기서 직접 머지하셔도 되고, VibeSafe 화면에서 적용하셔도 됩니다.`,
      `어느 쪽이든 VibeSafe는 기본 브랜치에 직접 커밋하지 않습니다.`,
    ]
      .filter(Boolean)
      .join("\n");

    const pr = await openPullRequest(writeToken, repo.owner, repo.repo, {
      title: `[VibeSafe] ${response.title}`.slice(0, 200),
      body,
      head: branchName,
      base: repo.defaultBranch,
    });

    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: {
        status: "opened",
        branchName,
        prUrl: pr.url,
        prNumber: pr.number,
        openedAt: new Date(),
      },
    });
    await logAction({
      projectId,
      action: "pr_opened",
      summary: `수정안 PR #${pr.number}을 열었습니다 — ${response.title}`,
      detail: { proposalId: proposal.id, prUrl: pr.url, files: accepted.map((c) => c.path) },
      incidentId: diagnosis.incidentId,
    });

    return {
      proposalId: proposal.id,
      status: "opened",
      title: response.title,
      explanation: response.explanation,
      prUrl: pr.url,
      changedFiles: accepted.map((c) => c.path),
      suggestsFlowUpdate: false,
      riskLevel: risk.level,
      riskReason: risk.reason,
    };
  } catch (error) {
    const message = (error as Error).message;
    await prisma.vibesafeFixProposal.update({
      where: { id: proposal.id },
      data: { status: "failed", error: message.slice(0, 500), branchName },
    });
    throw new FixError(`PR을 열지 못했습니다: ${message}`, "PR_FAILED");
  }
}
