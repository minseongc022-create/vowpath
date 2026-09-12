import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryPanel } from "@/vibesafe/components/HistoryPanel";
import { getProjectHistory } from "@/vibesafe/lib/history";
import { getOwnedProject } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "안정성 이력" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");
  const { projectId } = await params;

  const project = await getOwnedProject(session.userId, projectId);
  if (!project) notFound();
  const history = await getProjectHistory(projectId);

  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">안정성 이력</h1>
            <p className="vs-page-sub">{project.name}</p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">앱 상태로</Link>
        </div>
        <HistoryPanel history={history} />
      </div>
    </div>
  );
}
