import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SecurityPanel } from "@/vibesafe/components/SecurityPanel";
import { getOwnedProject } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";
import { prisma } from "@/vibesafe/lib/db";

export const metadata = { title: "보안 점검" };
export const dynamic = "force-dynamic";

export default async function SecurityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");
  const { projectId } = await params;

  const project = await getOwnedProject(session.userId, projectId);
  if (!project) notFound();

  // 코드에서 찾은 것(저장소 분석)과 밖에서 본 것(공격 표면)을 한 화면에 모은다.
  const codeFindings = await prisma.vibesafeSecurityFinding.findMany({
    where: { projectId, status: "open" },
    orderBy: { severity: "asc" },
    take: 20,
  });

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">보안 점검</h1>
            <p className="vs-page-sub">{project.name}</p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">앱 상태로</Link>
        </div>

        <SecurityPanel projectId={projectId} />

        {codeFindings.length > 0 && (
          <div className="vs-card vs-card-flush">
            <div className="vs-card-head">
              <h2 className="vs-section-title">코드에서 발견한 것 {codeFindings.length}건</h2>
              <span className="vs-badge" data-tone="neutral">저장소 분석</span>
            </div>
            <ul className="vs-flow-list">
              {codeFindings.map((finding) => (
                <li className="vs-flow-item" key={finding.id} style={{ alignItems: "flex-start" }}>
                  <span className="vs-badge" data-tone={
                    finding.severity === "high" ? "down" : finding.severity === "medium" ? "warn" : "neutral"
                  }>
                    {finding.severity === "high" ? "높음" : finding.severity === "medium" ? "보통" : "낮음"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="vs-flow-name">{finding.title}</div>
                    <p className="vs-flow-desc" style={{ color: "var(--vs-ink-soft)" }}>{finding.advice}</p>
                    <p className="vs-flow-desc vs-mono">
                      {finding.filePath}{finding.line ? `:${finding.line}` : ""} — {finding.evidence}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="vs-hint">
          전문 보안 감사를 대신하지 않습니다. 바이브코딩 앱에서 실제로 자주 나는 사고
          유형만 확인합니다. 발견한 값 자체는 저장하지 않습니다.
        </p>
      </div>
    </div>
  );
}
