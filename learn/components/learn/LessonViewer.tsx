"use client";

import { useState } from "react";
import type { DemoCourse, DemoLesson } from "@/learn/lib/demo-data";
import type { DemoMindmapNode } from "@/learn/lib/demo-data";
import { VideoStage } from "@/learn/components/learn/VideoStage";
import { MindmapPanel } from "@/learn/components/learn/MindmapPanel";
import { CurriculumPanel } from "@/learn/components/learn/CurriculumPanel";
import { LessonNotesEditor } from "@/learn/components/learn/LessonNotesEditor";
import { cn } from "@/learn/lib/utils";
import type { SidebarTab } from "@/learn/types";
import Link from "next/link";

type LessonViewerProps = {
  course: DemoCourse;
  lesson: DemoLesson;
  mindmapNodes: DemoMindmapNode[];
  userId?: string;
};

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "mindmap", label: "마인드맵" },
  { id: "curriculum", label: "커리큘럼" },
  { id: "notes", label: "필기" },
];

export function LessonViewer({
  course,
  lesson,
  mindmapNodes,
  userId,
}: LessonViewerProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("mindmap");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-learn-bg">
      {/* Top bar */}
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
        {/* Desktop: toggle sidebar */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="hidden lg:flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-learn-ink-muted transition-colors hover:bg-learn-muted hover:text-learn-ink"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
          {sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        </button>
      </header>

      {/* YouTube-style split layout */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Main content — video + meta */}
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto learn-scroll",
            sidebarOpen ? "lg:max-w-[calc(100%-360px)]" : "lg:max-w-full",
          )}
        >
          <div className="mx-auto max-w-4xl px-0 md:px-6 md:py-4">
            <VideoStage lesson={lesson} courseTitle={course.title} />
          </div>
        </main>

        {/* Right sidebar — mindmap / curriculum / notes */}
        <aside
          className={cn(
            "flex flex-col border-learn-border bg-learn-sidebar",
            // Mobile: bottom panel
            "max-h-[45dvh] border-t lg:max-h-none lg:w-[360px] lg:shrink-0 lg:border-t-0 lg:border-l",
            !sidebarOpen && "hidden lg:flex",
            sidebarOpen && "flex",
          )}
        >
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-learn-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSidebarTab(tab.id)}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold transition-colors",
                  sidebarTab === tab.id
                    ? "border-b-2 border-learn-primary text-learn-primary"
                    : "text-learn-ink-muted hover:text-learn-ink",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {sidebarTab === "mindmap" && <MindmapPanel nodes={mindmapNodes} />}
            {sidebarTab === "curriculum" && (
              <CurriculumPanel course={course} currentLessonSlug={lesson.slug} />
            )}
            {sidebarTab === "notes" && (
              <LessonNotesEditor lessonId={lesson.id} userId={userId} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
