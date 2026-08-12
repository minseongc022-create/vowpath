"use client";

import { useCallback, useEffect, useState } from "react";
import type { DemoCourse, DemoLesson } from "@/learn/lib/demo-data";
import type { DemoMindmapNode } from "@/learn/lib/demo-data";
import type { MaterialRecord, MindmapTreeNode } from "@/learn/types/material";
import { VideoStage } from "@/learn/components/learn/VideoStage";
import { MindmapPanel } from "@/learn/components/learn/MindmapPanel";
import { KeySummaryPanel } from "@/learn/components/learn/KeySummaryPanel";
import { CurriculumPanel } from "@/learn/components/learn/CurriculumPanel";
import { LessonNotesEditor } from "@/learn/components/learn/LessonNotesEditor";
import { LessonLibraryTab } from "@/learn/components/learn/LessonLibraryTab";
import { cn } from "@/learn/lib/utils";
import type { SidebarTab } from "@/learn/types";
import Link from "next/link";

type LessonViewerProps = {
  course: DemoCourse;
  lesson: DemoLesson;
  fallbackMindmap: DemoMindmapNode[];
  userId?: string;
  initialMaterials?: MaterialRecord[];
};

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "summary", label: "핵심" },
  { id: "mindmap", label: "마인드맵" },
  { id: "curriculum", label: "커리큘럼" },
  { id: "notes", label: "필기" },
  { id: "library", label: "저장소" },
];

export function LessonViewer({
  course,
  lesson,
  fallbackMindmap,
  userId,
  initialMaterials = [],
}: LessonViewerProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("summary");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMaterial, setActiveMaterial] = useState<MaterialRecord | null>(
    initialMaterials.find((m) => m.status === "READY") ?? initialMaterials[0] ?? null,
  );

  const onMaterialLinked = useCallback((m: MaterialRecord) => {
    setActiveMaterial(m);
    if (m.status === "READY") setSidebarTab("summary");
  }, []);

  // Poll while linked material is processing
  useEffect(() => {
    if (!activeMaterial || ["READY", "FAILED"].includes(activeMaterial.status)) {
      return;
    }
    const t = setInterval(async () => {
      const res = await fetch(`/learn/api/library/${activeMaterial.id}`);
      if (res.ok) {
        const updated = (await res.json()) as MaterialRecord;
        setActiveMaterial(updated);
        if (updated.status === "READY") setSidebarTab("summary");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [activeMaterial?.id, activeMaterial?.status]);

  const mindmapNodes: MindmapTreeNode[] =
    activeMaterial?.analysis?.mindmapTree?.length
      ? activeMaterial.analysis.mindmapTree
      : fallbackMindmap;

  const youtubeUrl =
    activeMaterial?.sourceUrl ??
    (lesson.videoUrl?.includes("youtube") || lesson.videoUrl?.includes("youtu.be")
      ? lesson.videoUrl
      : null);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-learn-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-learn-border bg-learn-surface px-3 md:px-4">
        <Link
          href={`/learn/courses/${course.slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-learn-ink-muted transition-colors hover:bg-learn-muted hover:text-learn-ink"
          aria-label="뒤로"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-learn-ink">{course.title}</p>
        </div>
        {activeMaterial && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <span className="learn-live-dot h-1 w-1 rounded-full bg-emerald-500" />
            AI 연동
          </span>
        )}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="hidden lg:flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-learn-ink-muted transition-colors hover:bg-learn-muted hover:text-learn-ink"
        >
          {sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        </button>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto learn-scroll",
            sidebarOpen ? "lg:max-w-[calc(100%-360px)]" : "lg:max-w-full",
          )}
        >
          <div className="mx-auto max-w-4xl px-0 md:px-6 md:py-4">
            <VideoStage
              lesson={lesson}
              courseTitle={course.title}
              youtubeUrl={youtubeUrl}
            />
          </div>
        </main>

        <aside
          className={cn(
            "flex flex-col border-learn-border bg-learn-sidebar",
            "max-h-[50dvh] border-t lg:max-h-none lg:w-[360px] lg:shrink-0 lg:border-t-0 lg:border-l",
            !sidebarOpen && "hidden lg:flex",
            sidebarOpen && "flex",
          )}
        >
          <div className="flex shrink-0 border-b border-learn-border overflow-x-auto learn-scroll">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSidebarTab(tab.id)}
                className={cn(
                  "shrink-0 px-3 py-3 text-[11px] font-semibold transition-colors whitespace-nowrap",
                  sidebarTab === tab.id
                    ? "border-b-2 border-learn-primary text-learn-primary"
                    : "text-learn-ink-muted hover:text-learn-ink",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {sidebarTab === "summary" && (
              <KeySummaryPanel
                summary={activeMaterial?.analysis?.summary}
                sections={activeMaterial?.analysis?.sections ?? []}
                keywords={activeMaterial?.analysis?.keywords}
                compact
              />
            )}
            {sidebarTab === "mindmap" && <MindmapPanel nodes={mindmapNodes} />}
            {sidebarTab === "curriculum" && (
              <CurriculumPanel course={course} currentLessonSlug={lesson.slug} />
            )}
            {sidebarTab === "notes" && (
              <LessonNotesEditor lessonId={lesson.id} userId={userId} />
            )}
            {sidebarTab === "library" && (
              <LessonLibraryTab
                courseSlug={course.slug}
                lessonSlug={lesson.slug}
                lessonTitle={lesson.title}
                videoUrl={lesson.videoUrl}
                onMaterialLinked={onMaterialLinked}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
