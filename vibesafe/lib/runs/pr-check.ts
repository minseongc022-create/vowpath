import "server-only";

import { prisma } from "../db";
import { commentOnPullRequest } from "../github/client";
import { resolveWriteToken } from "../github/write-connection";

/**
 * PR 프리뷰 검사 결과를 PR에 돌려준다.
 *
 * ★ 쓰기 연결이 없으면 조용히 건너뛴다
 *
 * 댓글을 달려면 저장소 쓰기 권한이 필요한데, 그걸 이유로 프리뷰 검사 자체를
 * 막지는 않는다. 권한이 없으면 결과는 VibeSafe 화면에만 남는다 — 값이
 * 줄어들 뿐 기능이 죽지는 않는다.
 */
export async function reportPrCheckResult(runId: string): Promise<void> {
  const run = await prisma.vibesafeTestRun.findUnique({
    where: { id: runId },
    include: {
      results: { orderBy: { startedAt: "asc" } },
      project: { include: { repository: true } },
    },
  });
  if (!run || run.trigger !== "pr" || !run.prNumber || !run.project.repository) return;

  let token: string;
  try {
    token = await resolveWriteToken(run.project.userId);
  } catch {
    return; // 쓰기 연결 없음 — 화면에만 남긴다.
  }

  const failed = run.results.filter((r) => r.status === "failed");
  const passed = run.results.filter((r) => r.status === "passed");

  const body = failed.length
    ? [
        `## 🔴 VibeSafe — 이 PR을 머지하면 ${failed.length}개 기능이 깨집니다`,
        "",
        `프리뷰 배포(\`${run.targetUrl ?? ""}\`)에서 핵심 흐름을 실제 브라우저로 돌려봤습니다.`,
        "",
        "| 기능 | 결과 | 실패한 단계 |",
        "|---|---|---|",
        ...failed.map(
          (r) => `| ${r.flowTitle} | ❌ 실패 | ${r.failedStepDescription ?? "-"} |`,
        ),
        ...passed.map((r) => `| ${r.flowTitle} | ✅ 정상 | - |`),
        "",
        failed[0]?.errorMessage
          ? `<details><summary>오류 메시지</summary>\n\n\`\`\`\n${failed[0].errorMessage.slice(0, 1500)}\n\`\`\`\n\n</details>`
          : "",
        "",
        "---",
        "_VibeSafe가 머지 전에 확인했습니다._",
      ]
        .filter(Boolean)
        .join("\n")
    : [
        `## ✅ VibeSafe — 핵심 기능 ${passed.length}개 모두 정상`,
        "",
        `프리뷰 배포에서 실제 브라우저로 확인했습니다: ${passed.map((r) => r.flowTitle).join(", ")}`,
        "",
        "---",
        "_VibeSafe가 머지 전에 확인했습니다._",
      ].join("\n");

  try {
    await commentOnPullRequest(
      token,
      run.project.repository.owner,
      run.project.repository.repo,
      run.prNumber,
      body,
    );
  } catch (error) {
    console.error("[vibesafe] PR comment failed:", (error as Error).message);
  }
}
