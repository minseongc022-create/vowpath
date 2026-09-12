import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState, ResultBadge } from "@/vibesafe/components/StatusBits";
import { listRuns } from "@/vibesafe/lib/dashboard";
import { absoluteTime, duration, TRIGGER_LABELS } from "@/vibesafe/lib/format";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "검사 기록" };
export const dynamic = "force-dynamic";

export default async function RunsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  const { projectId } = await params;
  if (!(await assertProjectOwner(session.userId, projectId))) notFound();

  const runs = await listRuns(session.userId, projectId, 30);

  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">검사 기록</h1>
            <p className="vs-page-sub">최근 30건입니다.</p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">
            앱 상태로
          </Link>
        </div>

        <div className="vs-card vs-card-flush">
          {runs.length === 0 ? (
            <EmptyState title="아직 검사 기록이 없습니다">
              <p className="vs-hint">흐름을 켜고 &ldquo;지금 확인하기&rdquo;를 눌러보세요.</p>
            </EmptyState>
          ) : (
            <ul className="vs-flow-list">
              {runs.map((run) => (
                <li className="vs-flow-item" key={run.id}>
                  <ResultBadge status={run.status} />
                  <div style={{ minWidth: 0 }}>
                    <div className="vs-flow-name">{absoluteTime(run.queuedAt)}</div>
                    <p className="vs-flow-desc">
                      {TRIGGER_LABELS[run.trigger] ?? run.trigger} · 흐름 {run._count.results}개
                      {run.durationMs ? ` · ${duration(run.durationMs)}` : ""}
                      {run.commitSha ? ` · ${run.commitSha.slice(0, 7)}` : ""}
                    </p>
                  </div>
                  <span className="vs-spacer" />
                  <Link href={`/vibesafe/projects/${projectId}/runs/${run.id}`} className="vs-btn vs-btn-sm">
                    자세히 보기
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
