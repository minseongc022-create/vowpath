import { notFound } from "next/navigation";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { MindmapDashboard } from "@/learn/components/mindmap/MindmapDashboard";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const m = await getMaterial(userId, id);
    return { title: `${m?.title ?? "자료"} — 마인드맵` };
  } catch {
    return { title: "마인드맵 대시보드" };
  }
}

export default async function MindmapDashboardPage({ params }: Props) {
  const { id } = await params;

  let material;
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    material = await getMaterial(userId, id);
  } catch {
    notFound();
  }

  if (!material) notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 md:py-6">
      <Link
        href={`/learn/library/${id}`}
        className="mb-4 inline-flex text-sm font-medium text-learn-ink-muted hover:text-learn-primary"
      >
        ← {material.title}
      </Link>
      <MindmapDashboard material={material} />
    </main>
  );
}
