import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SharePanel } from "@/vibesafe/components/SharePanel";
import { prisma } from "@/vibesafe/lib/db";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "상태 배지" };
export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");
  const { projectId } = await params;
  if (!(await assertProjectOwner(session.userId, projectId))) notFound();

  const project = await prisma.vibesafeProject.findUnique({
    where: { id: projectId },
    select: { name: true, publicSlug: true, publicStatus: true },
  });
  if (!project) notFound();

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;

  const initial =
    project.publicStatus && project.publicSlug
      ? {
          slug: project.publicSlug,
          statusUrl: `${base}/vibesafe/status/${project.publicSlug}`,
          badgeUrl: `${base}/vibesafe/badge/${project.publicSlug}.svg`,
          markdown: `[![VibeSafe](${base}/vibesafe/badge/${project.publicSlug}.svg)](${base}/vibesafe/status/${project.publicSlug})`,
          projectName: project.name,
        }
      : null;

  return (
    <div className="vs-container">
      <div className="vs-stack" style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="vs-row-between">
          <div>
            <h1 className="vs-page-title">상태 배지</h1>
            <p className="vs-page-sub">{project.name}</p>
          </div>
          <Link href={`/vibesafe/projects/${projectId}`} className="vs-btn vs-btn-sm">앱 상태로</Link>
        </div>
        <SharePanel projectId={projectId} initial={initial} />
      </div>
    </div>
  );
}
