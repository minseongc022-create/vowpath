import { notFound, redirect } from "next/navigation";
import { AppMapPanel } from "@/vibesafe/components/AppMapPanel";
import { ProjectWorkspace } from "@/vibesafe/components/ProjectWorkspace";
import { UiModeQuestion } from "@/vibesafe/components/UiModePicker";
import { getAppMap } from "@/vibesafe/lib/app-map";
import { getProjectDashboard } from "@/vibesafe/lib/dashboard";
import { getSession } from "@/vibesafe/lib/session";
import { getUiModePreference } from "@/vibesafe/lib/user-prefs";

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
  const [data, preference, appMap] = await Promise.all([
    getProjectDashboard(session.userId, projectId),
    getUiModePreference(session.userId),
    getAppMap(projectId),
  ]);
  if (!data) notFound();

  return (
    <>
      {/* 아직 물어본 적 없으면 여기서 한 번 묻는다. 답하면 다시 안 나온다. */}
      {!preference.asked && (
        <div className="vs-container">
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <UiModeQuestion initialMode={preference.mode} />
          </div>
        </div>
      )}
      <ProjectWorkspace data={data} />
      <AppMapPanel map={appMap} projectId={projectId} mode={preference.mode} />
    </>
  );
}
