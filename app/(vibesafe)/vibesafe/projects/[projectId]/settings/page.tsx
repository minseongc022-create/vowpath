import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ProjectSettings } from "@/vibesafe/components/ProjectSettings";
import { getConnection } from "@/vibesafe/lib/github/connection";
import { getOwnedProject } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "프로젝트 설정" };
export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  const { projectId } = await params;
  const project = await getOwnedProject(session.userId, projectId);
  if (!project) notFound();

  const connection = await getConnection(session.userId);

  // webhook 주소는 실제로 들어온 호스트를 그대로 쓴다 — 환경변수에 박아두면
  // 미리보기 배포나 도메인 변경 때 안내가 틀린 주소를 가리킨다.
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <ProjectSettings
      projectId={project.id}
      projectName={project.name}
      productionUrl={project.deploymentTargets.find((t) => t.kind === "production")?.baseUrl ?? ""}
      repository={
        project.repository
          ? {
              owner: project.repository.owner,
              repo: project.repository.repo,
              defaultBranch: project.repository.defaultBranch,
            }
          : null
      }
      hasCredential={Boolean(project.credential)}
      webhookUrl={`${proto}://${host}/api/vibesafe/webhooks/github`}
      githubAppConnected={connection?.authKind === "app_installation"}
    />
  );
}
