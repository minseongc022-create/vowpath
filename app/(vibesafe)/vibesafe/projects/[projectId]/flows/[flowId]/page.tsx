import { notFound, redirect } from "next/navigation";
import { FlowEditor } from "@/vibesafe/components/FlowEditor";
import { assertProjectOwner } from "@/vibesafe/lib/projects";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "흐름 수정" };
export const dynamic = "force-dynamic";

export default async function FlowEditPage({
  params,
}: {
  params: Promise<{ projectId: string; flowId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/vibesafe/login");

  const { projectId, flowId } = await params;
  if (!(await assertProjectOwner(session.userId, projectId))) notFound();

  return <FlowEditor projectId={projectId} flowId={flowId} />;
}
