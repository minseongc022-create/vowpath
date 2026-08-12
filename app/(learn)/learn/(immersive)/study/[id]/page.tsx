import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { StudyFlowClient } from "@/learn/components/study/StudyFlowClient";
import { notFound } from "next/navigation";
import type { QuizEvidence } from "@/learn/types/quiz";

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seek?: string; line?: string; node?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getLearnSession();
  const userId = resolveUserId(session?.user?.id);
  const material = await getMaterial(userId, id);
  if (!material) notFound();

  let initialSeek: QuizEvidence | null = null;
  if (sp.seek || sp.line || sp.node) {
    initialSeek = {
      snippet: "",
      startSec: sp.seek ? Number(sp.seek) : undefined,
      lineId: sp.line,
      nodeId: sp.node,
    };
  }

  return <StudyFlowClient initial={material} initialSeek={initialSeek} />;
}
