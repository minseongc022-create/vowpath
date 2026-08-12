import Link from "next/link";
import { NotesList } from "@/learn/components/learn/NotesList";
import { getLearnSession } from "@/learn/lib/auth";
import { prisma, isDatabaseConfigured } from "@/learn/lib/db";
import type { NoteRecord } from "@/learn/types";

export const metadata = { title: "필기" };

const DEMO_NOTES: NoteRecord[] = [
  {
    id: "demo-note-1",
    title: "AI 학습 에이전트 핵심",
    content: "- YouTube형 레이아웃\n- 실시간 마인드맵\n- Supabase 동기화",
    updatedAt: new Date().toISOString(),
  },
];

async function getNotes(userId?: string): Promise<NoteRecord[]> {
  if (!userId || !isDatabaseConfigured()) return DEMO_NOTES;

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  if (notes.length === 0) return DEMO_NOTES;

  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    lessonId: n.lessonId,
    updatedAt: n.updatedAt.toISOString(),
  }));
}

export default async function NotesPage() {
  const session = await getLearnSession();
  const notes = await getNotes(session?.user?.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:py-8 learn-animate-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-learn-ink">내 필기</h1>
          <p className="mt-1 text-sm text-learn-ink-muted">
            강의 중 작성한 필기가 여기에 모입니다
          </p>
        </div>
        <Link
          href="/learn/courses/ai-fundamentals/lessons/intro"
          className="text-sm font-medium text-learn-primary"
        >
          강의 보기
        </Link>
      </div>
      <NotesList initialNotes={notes} userId={session?.user?.id} />
    </main>
  );
}
