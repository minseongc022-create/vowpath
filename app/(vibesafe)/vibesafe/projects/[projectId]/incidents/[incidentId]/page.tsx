import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RepairPanel } from "@/vibesafe/components/RepairPanel";
import { prisma } from "@/vibesafe/lib/db";
import { absoluteTime } from "@/vibesafe/lib/format";
import { getPermissions } from "@/vibesafe/lib/permissions";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "문제 상세" };
export const dynamic = "force-dynamic";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ projectId: string; incidentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");
  const { projectId, incidentId } = await params;
  if (!(await assertProjectOwner(session.userId, projectId))) notFound();

  const incident = await prisma.vibesafeIncident.findFirst({
    where: { id: incidentId, projectId },
  });
  if (!incident) notFound();

  const [permissions, diagnosis, proposals] = await Promise.all([
    getPermissions(projectId),
    prisma.vibesafeDiagnosis.findFirst({
      where: { incidentId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vibesafeFixProposal.findMany({
      where: { incidentId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">{incident.flowTitle}</h1>
            <p className="vs-page-sub">
              {incident.status === "open" ? "문제가 계속되고 있습니다" : "해결됨"} ·{" "}
              {absoluteTime(incident.detectedAt)} 발견
            </p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">앱 상태로</Link>
        </div>

        <div className="vs-status-hero" data-state={incident.status === "open" ? "down" : "ok"}>
          <div className="vs-status-line">
            <span className="vs-status-dot" data-state={incident.status === "open" ? "down" : "ok"} />
            <span className="vs-status-title">
              {incident.status === "open" ? "🔴 문제 발견" : "복구됨"}
            </span>
          </div>
          {incident.failedStepDescription && (
            <p className="vs-status-note">실패한 단계: {incident.failedStepDescription}</p>
          )}
        </div>

        {/* 이미 만들어진 PR이 있으면 먼저 보여준다 */}
        {proposals.some((p) => p.prUrl) && (
          <div className="vs-card vs-stack">
            <h3 className="vs-section-title">올라간 수정안</h3>
            {proposals
              .filter((p) => p.prUrl)
              .map((p) => (
                <div key={p.id} className="vs-row-between">
                  <span>{p.title}</span>
                  <a className="vs-btn vs-btn-sm" href={p.prUrl!} target="_blank" rel="noreferrer noopener">
                    PR #{p.prNumber} 보기
                  </a>
                </div>
              ))}
          </div>
        )}

        {/* 자동으로 이미 진단한 결과가 있으면 그걸 보여주고, 없으면 버튼을 준다 */}
        {diagnosis && (
          <div className="vs-card vs-stack">
            <h3 className="vs-section-title">자동 분석 결과</h3>
            <p style={{ fontSize: 14.5, margin: 0 }}>{diagnosis.summary}</p>
            {diagnosis.suggestion && <p className="vs-hint">{diagnosis.suggestion}</p>}
          </div>
        )}

        <RepairPanel
          projectId={projectId}
          incidentId={incidentId}
          flowTitle={incident.flowTitle}
          permissions={permissions}
        />

        {incident.errorMessage && (
          <details className="vs-card vs-details" style={{ padding: 0 }}>
            <summary>개발자용 원본 오류</summary>
            <pre className="vs-code">{incident.errorMessage}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
