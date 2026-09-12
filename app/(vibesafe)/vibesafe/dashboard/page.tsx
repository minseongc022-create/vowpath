import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusDot, EmptyState } from "@/vibesafe/components/StatusBits";
import { listProjectCards } from "@/vibesafe/lib/dashboard";
import { relativeTime } from "@/vibesafe/lib/format";
import { isDatabaseConfigured } from "@/vibesafe/lib/db";
import { getSession } from "@/vibesafe/lib/session";
import { recordReturnVisit } from "@/vibesafe/lib/analytics";

export const metadata = { title: "내 앱" };
export const dynamic = "force-dynamic";

export default async function VibesafeDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  if (!isDatabaseConfigured()) {
    return (
      <div className="vs-container">
        <div className="vs-alert" data-tone="warn">
          서버 데이터베이스가 연결되지 않았습니다. 운영자에게 문의해주세요.
        </div>
      </div>
    );
  }

  const [projects] = await Promise.all([
    listProjectCards(session.userId),
    recordReturnVisit(session.userId),
  ]);

  // 프로젝트가 하나뿐이면 목록을 보여줄 이유가 없다 — 바로 그 앱 상태로 보낸다.
  if (projects.length === 1) redirect(`/vibesafe/projects/${projects[0].id}`);

  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">내 앱</h1>
            <p className="vs-page-sub">연결한 앱의 상태를 한눈에 봅니다.</p>
          </div>
          <Link href="/vibesafe/projects/new" className="vs-btn vs-btn-primary">
            앱 연결하기
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="vs-card">
            <EmptyState title="아직 연결한 앱이 없습니다">
              <p className="vs-hint" style={{ marginBottom: 16 }}>
                GitHub 저장소와 배포된 주소를 연결하면 핵심 기능을 찾아 확인하기 시작합니다.
              </p>
              <Link href="/vibesafe/projects/new" className="vs-btn vs-btn-primary">
                첫 앱 연결하기
              </Link>
            </EmptyState>
          </div>
        ) : (
          <div className="vs-grid-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/vibesafe/projects/${project.id}`}
                className="vs-card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="vs-row" style={{ marginBottom: 10 }}>
                  <StatusDot health={project.health} />
                  <strong style={{ fontSize: 16 }}>{project.name}</strong>
                  <span className="vs-spacer" />
                  <span
                    className="vs-badge"
                    data-tone={
                      project.health === "ok" ? "ok" : project.health === "down" ? "down" : "neutral"
                    }
                  >
                    {project.headline}
                  </span>
                </div>
                <p className="vs-hint">
                  확인 중인 흐름 {project.activeFlowCount}개
                  {project.pendingFlowCount > 0 && ` · 확인 대기 ${project.pendingFlowCount}개`}
                </p>
                <p className="vs-hint">마지막 확인: {relativeTime(project.lastCheckedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
