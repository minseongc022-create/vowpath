import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PermissionPanel } from "@/vibesafe/components/PermissionPanel";
import { getOwnedProject } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "권한" };
export const dynamic = "force-dynamic";

export default async function PermissionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");
  const { projectId } = await params;

  const project = await getOwnedProject(session.userId, projectId);
  if (!project) notFound();

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">권한</h1>
            <p className="vs-page-sub">{project.name}</p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">앱 상태로</Link>
        </div>
        <PermissionPanel projectId={projectId} />
      </div>
    </div>
  );
}
