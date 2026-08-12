import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { StudyFlowClient } from "@/learn/components/study/StudyFlowClient";
import { notFound } from "next/navigation";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getLearnSession();
  const userId = resolveUserId(session?.user?.id);
  const material = await getMaterial(userId, id);
  if (!material) notFound();

  return <StudyFlowClient initial={material} />;
}
