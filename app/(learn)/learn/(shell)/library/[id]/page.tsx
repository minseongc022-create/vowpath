import { notFound } from "next/navigation";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { MaterialDetailClient } from "@/learn/components/library/MaterialDetailClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const m = await getMaterial(userId, id);
    return { title: m?.title ?? "학습 자료" };
  } catch {
    return { title: "학습 자료" };
  }
}

export default async function MaterialDetailPage({ params }: Props) {
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
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <MaterialDetailClient initial={material} />
    </main>
  );
}
