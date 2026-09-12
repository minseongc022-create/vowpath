import { notFound, redirect } from "next/navigation";
import { ProjectWorkspace } from "@/vibesafe/components/ProjectWorkspace";
import { getProjectDashboard } from "@/vibesafe/lib/dashboard";
import { getSession } from "@/vibesafe/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) return { title: "내 앱" };
  const data = await getProjectDashboard(session.userId, (await params).projectId);
  return { title: data?.project.name ?? "내 앱" };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  const { projectId } = await params;
  const data = await getProjectDashboard(session.userId, projectId);
  if (!data) notFound();

  return <ProjectWorkspace data={data} />;
}
