import { PlannerBoard } from "@/learn/components/learn/PlannerBoard";
import { getLearnSession } from "@/learn/lib/auth";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";
import type { PlannerRecord } from "@/learn/types";

export const metadata = { title: "플래너" };

const DEMO_PLANNER: PlannerRecord[] = [
  {
    id: "demo-1",
    title: "AI 기초 1강 완료하기",
    description: "마인드맵과 필기 연습",
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false,
    priority: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "주간 학습 목표 설정",
    dueDate: new Date(Date.now() + 604800000).toISOString(),
    completed: false,
    priority: 0,
    updatedAt: new Date().toISOString(),
  },
];

async function getPlannerItems(userId?: string): Promise<PlannerRecord[]> {
  if (!userId || !isDatabaseConfigured()) return DEMO_PLANNER;

  const items = await prisma.plannerItem.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });

  if (items.length === 0) return DEMO_PLANNER;

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate?.toISOString() ?? null,
    completed: item.completed,
    priority: item.priority,
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export default async function PlannerPage() {
  const session = await getLearnSession();
  const items = await getPlannerItems(session?.user?.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:py-8 learn-animate-in">
      <h1 className="mb-1 text-2xl font-bold text-learn-ink">학습 플래너</h1>
      <p className="mb-6 text-sm text-learn-ink-muted">
        모든 기기에서 실시간 동기화 · 오르조처럼 데이터가 사라지지 않습니다
      </p>
      <PlannerBoard initialItems={items} userId={session?.user?.id} />
    </main>
  );
}
