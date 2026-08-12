import { LibraryUploadForm } from "@/learn/components/library/LibraryUploadForm";
import { LibrarySearch } from "@/learn/components/library/LibrarySearch";
import { getLearnSession } from "@/learn/lib/auth";
import { listMaterials, resolveUserId } from "@/learn/lib/library/repository";

export const metadata = {
  title: "내 학습 저장소",
};

export default async function LibraryPage() {
  const session = await getLearnSession();
  let materials: Awaited<ReturnType<typeof listMaterials>> = [];

  try {
    const userId = resolveUserId(session?.user?.id);
    materials = await listMaterials(userId);
  } catch {
    materials = [];
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-learn-ink md:text-3xl">
          나만의 학습 저장소
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-learn-ink-muted md:text-base">
          YouTube, PDF, 외부 유료 강의 텍스트를 AI가 청크 단위로 완벽히 소화합니다.
          메가스터디 AI 자막 누락 없이, 끊김 없는 전체 스크립트와 실시간 마인드맵을 제공합니다.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <LibrarySearch initialMaterials={materials} />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <LibraryUploadForm />
        </div>
      </div>
    </main>
  );
}
