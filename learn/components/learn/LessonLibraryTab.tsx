"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaterialRecord } from "@/learn/types/material";
import { Button } from "@/learn/components/ui/Button";
import Link from "next/link";

type LessonLibraryTabProps = {
  courseSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  videoUrl?: string | null;
  onMaterialLinked?: (material: MaterialRecord) => void;
};

export function LessonLibraryTab({
  courseSlug,
  lessonSlug,
  lessonTitle,
  videoUrl,
  onMaterialLinked,
}: LessonLibraryTabProps) {
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [allMaterials, setAllMaterials] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(videoUrl ?? "");

  const refresh = useCallback(async () => {
    const [linked, all] = await Promise.all([
      fetch(`/learn/api/library/for-lesson?course=${courseSlug}&lesson=${lessonSlug}`).then(
        (r) => (r.ok ? r.json() : []) as Promise<MaterialRecord[]>,
      ),
      fetch("/learn/api/library").then(
        (r) => (r.ok ? r.json() : []) as Promise<MaterialRecord[]>,
      ),
    ]);
    setMaterials(linked);
    setAllMaterials(all);
    if (linked[0]) onMaterialLinked?.(linked[0]);
  }, [courseSlug, lessonSlug, onMaterialLinked]);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function ingestYouTube() {
    if (!youtubeUrl.trim()) return;
    setIngesting(true);
    try {
      const res = await fetch("/learn/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "YOUTUBE",
          sourceUrl: youtubeUrl.trim(),
          title: lessonTitle,
          linkedCourse: courseSlug,
          linkedLesson: lessonSlug,
          async: true,
        }),
      });
      if (res.ok) {
        const mat = (await res.json()) as MaterialRecord;
        onMaterialLinked?.(mat);
        await refresh();
      }
    } finally {
      setIngesting(false);
    }
  }

  async function linkExisting(materialId: string) {
    const res = await fetch(`/learn/api/library/${materialId}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseSlug, lessonSlug }),
    });
    if (res.ok) {
      const mat = (await res.json()) as MaterialRecord;
      onMaterialLinked?.(mat);
      await refresh();
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-learn-ink-muted text-center">불러오는 중…</p>;
  }

  return (
    <div className="learn-scroll flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-learn-ink mb-2">YouTube AI 소화</h3>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="YouTube URL"
          className="mb-2 h-10 w-full rounded-xl border border-learn-border px-3 text-sm outline-none focus:border-learn-primary/50"
        />
        <Button
          size="sm"
          className="w-full"
          disabled={ingesting || !youtubeUrl.trim()}
          onClick={() => void ingestYouTube()}
        >
          {ingesting ? "AI 처리 중…" : "자막/Whisper → 마인드맵 연동"}
        </Button>
      </div>

      {materials.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-learn-ink mb-2">연결된 자료</h3>
          {materials.map((m) => (
            <Link
              key={m.id}
              href={`/learn/library/${m.id}`}
              className="mb-2 block rounded-xl border border-learn-primary/30 bg-learn-primary/5 p-3 transition-colors hover:bg-learn-primary/10"
            >
              <p className="text-sm font-semibold text-learn-ink">{m.title}</p>
              <p className="text-[11px] text-learn-ink-muted mt-0.5">{m.status}</p>
            </Link>
          ))}
        </div>
      )}

      {allMaterials.filter((m) => !materials.some((l) => l.id === m.id)).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-learn-ink mb-2">저장소에서 연결</h3>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto learn-scroll">
            {allMaterials
              .filter((m) => !materials.some((l) => l.id === m.id))
              .slice(0, 8)
              .map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => void linkExisting(m.id)}
                    className="w-full rounded-lg border border-learn-border px-3 py-2 text-left text-xs font-medium text-learn-ink-muted hover:bg-learn-muted hover:text-learn-ink"
                  >
                    + {m.title}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <Link
        href="/learn/library"
        className="block text-center text-xs font-medium text-learn-primary"
      >
        저장소 전체 보기 →
      </Link>
    </div>
  );
}
