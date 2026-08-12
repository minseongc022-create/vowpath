"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DemoCourse, DemoLesson } from "@/learn/lib/demo-data";
import type { DemoMindmapNode } from "@/learn/lib/demo-data";
import type { MaterialRecord, MindmapTreeNode } from "@/learn/types/material";
import { VideoStage } from "@/learn/components/learn/VideoStage";
import { KeySummaryPanel } from "@/learn/components/learn/KeySummaryPanel";
import { CurriculumPanel } from "@/learn/components/learn/CurriculumPanel";
import { LessonNotesEditor } from "@/learn/components/learn/LessonNotesEditor";
import { LessonLibraryTab } from "@/learn/components/learn/LessonLibraryTab";
import { MindmapSyncProvider } from "@/learn/components/mindmap/MindmapSyncContext";
import { InteractiveMindmapFlow } from "@/learn/components/mindmap/InteractiveMindmapFlow";
import { SyncedYouTubePlayer } from "@/learn/components/mindmap/SyncedYouTubePlayer";
import { SyncedTranscript } from "@/learn/components/mindmap/SyncedTranscript";
import { parseTranscript } from "@/learn/lib/mindmap/transcript-parse";
import { enrichMindmapAnchors } from "@/learn/lib/mindmap/anchors";
import { extractYouTubeVideoId } from "@/learn/lib/ingest/youtube";
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

export function LessonViewer(props: LessonViewerProps) {
  const { activeMaterial, ready } = useLessonMaterial(props.initialMaterials);

  if (ready && activeMaterial) {
    return <SyncedLessonViewer {...props} activeMaterial={activeMaterial} />;
  }

  return <BasicLessonViewer {...props} activeMaterial={activeMaterial} />;
}

function useLessonMaterial(initialMaterials: MaterialRecord[]) {
  const [activeMaterial, setActiveMaterial] = useState<MaterialRecord | null>(
    initialMaterials.find((m) => m.status === "READY") ?? initialMaterials[0] ?? null,
  );

  useEffect(() => {
    if (!activeMaterial || ["READY", "FAILED"].includes(activeMaterial.status)) return;
    const t = setInterval(async () => {
      const res = await fetch(`/learn/api/library/${activeMaterial.id}`);
      if (res.ok) setActiveMaterial((await res.json()) as MaterialRecord);
    }, 3000);
    return () => clearInterval(t);
  }, [activeMaterial?.id, activeMaterial?.status]);

  return {
    activeMaterial,
    setActiveMaterial,
    ready: activeMaterial?.status === "READY",
  };
}

function SyncedLessonViewer({
  course,
  lesson,
  fallbackMindmap,
  userId,
  initialMaterials,
  activeMaterial,
}: LessonViewerProps & { activeMaterial: MaterialRecord }) {
  const transcriptLines = useMemo(
    () => parseTranscript(activeMaterial.fullTranscript),
    [activeMaterial.fullTranscript],
  );

  const mindmapTree = useMemo(() => {
    const raw =
      activeMaterial.analysis?.mindmapTree?.length
        ? activeMaterial.analysis.mindmapTree
        : fallbackMindmap;
    return enrichMindmapAnchors(raw, transcriptLines);
  }, [activeMaterial, fallbackMindmap, transcriptLines]);

  const youtubeUrl =
    activeMaterial.sourceUrl ??
    (lesson.videoUrl?.includes("youtube") || lesson.videoUrl?.includes("youtu.be")
      ? lesson.videoUrl
      : null);

  return (
    <MindmapSyncProvider mindmapTree={mindmapTree} transcriptLines={transcriptLines}>
      <LessonViewerLayout
        course={course}
        lesson={lesson}
        userId={userId}
        initialMaterials={initialMaterials}
        activeMaterial={activeMaterial}
        mindmapTree={mindmapTree}
        youtubeUrl={youtubeUrl}
        synced
      />
    </MindmapSyncProvider>
  );
}

function BasicLessonViewer({
  course,
  lesson,
  fallbackMindmap,
  userId,
  initialMaterials,
  activeMaterial,
}: LessonViewerProps & { activeMaterial: MaterialRecord | null }) {
  const mindmapTree: MindmapTreeNode[] = fallbackMindmap;

  const youtubeUrl =
    activeMaterial?.sourceUrl ??
    (lesson.videoUrl?.includes("youtube") || lesson.videoUrl?.includes("youtu.be")
      ? lesson.videoUrl
      : null);

  return (
    <LessonViewerLayout
      course={course}
      lesson={lesson}
      userId={userId}
      initialMaterials={initialMaterials}
      activeMaterial={activeMaterial}
      mindmapTree={mindmapTree}
      youtubeUrl={youtubeUrl}
      synced={false}
    />
  );
}

function LessonViewerLayout({
  course,
  lesson,
  userId,
  initialMaterials,
  activeMaterial,
  mindmapTree,
  youtubeUrl,
  synced,
}: {
  course: DemoCourse;
  lesson: DemoLesson;
  userId?: string;
  initialMaterials: MaterialRecord[];
  activeMaterial: MaterialRecord | null;
  mindmapTree: MindmapTreeNode[];
  youtubeUrl: string | null;
  synced: boolean;
}) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("mindmap");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [material, setMaterial] = useState(activeMaterial);
  const [annotations, setAnnotations] = useState<import("@/learn/types/material").MindmapAnnotation[]>([]);

  const onMaterialLinked = useCallback((m: MaterialRecord) => {
    setMaterial(m);
    if (m.status === "READY") setSidebarTab("mindmap");
  }, []);

  const refreshAnnotations = useCallback(async () => {
    if (!material?.id) return;
    const res = await fetch(`/learn/api/mindmap/${material.id}/annotations`);
    if (res.ok) setAnnotations(await res.json());
  }, [material?.id]);

  useEffect(() => {
    setMaterial(activeMaterial);
  }, [activeMaterial]);

  useEffect(() => {
    void refreshAnnotations();
  }, [refreshAnnotations]);

  const hasYoutube = youtubeUrl && extractYouTubeVideoId(youtubeUrl);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-learn-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-learn-border bg-learn-surface px-3 md:px-4">
        <Link
          href={`/learn/courses/${course.slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-learn-ink-muted hover:bg-learn-muted"
          aria-label="뒤로"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-learn-ink">{course.title}</p>
        </div>
        {synced && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <span className="learn-live-dot h-1 w-1 rounded-full bg-emerald-500" />
            Live Sync
          </span>
        )}
        {material && (
          <Link
            href={`/learn/library/${material.id}/mindmap`}
            className="hidden sm:inline-flex text-[10px] font-bold text-learn-primary"
          >
            마인드맵 전체화면
          </Link>
        )}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="hidden lg:flex h-9 rounded-xl px-3 text-xs text-learn-ink-muted hover:bg-learn-muted"
        >
          {sidebarOpen ? "사이드바 닫기" : "열기"}
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
            {synced && hasYoutube ? (
              <>
                <SyncedYouTubePlayer youtubeUrl={youtubeUrl!} />
                <div className="mt-4 hidden md:block">
                  <SyncedTranscript compact />
                </div>
              </>
            ) : (
              <VideoStage lesson={lesson} courseTitle={course.title} youtubeUrl={youtubeUrl} />
            )}
          </div>
        </main>

        <aside
          className={cn(
            "flex flex-col border-learn-border bg-learn-sidebar learn-mindmap-flow",
            "max-h-[50dvh] border-t lg:max-h-none lg:w-[360px] lg:shrink-0 lg:border-t-0 lg:border-l",
            !sidebarOpen && "hidden lg:flex",
            sidebarOpen && "flex",
          )}
        >
          <div className="flex shrink-0 border-b border-learn-border overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSidebarTab(tab.id)}
                className={cn(
                  "shrink-0 px-3 py-3 text-[11px] font-semibold whitespace-nowrap",
                  sidebarTab === tab.id
                    ? "border-b-2 border-learn-primary text-learn-primary"
                    : "text-learn-ink-muted",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {sidebarTab === "summary" && (
              <KeySummaryPanel
                summary={material?.analysis?.summary}
                sections={material?.analysis?.sections ?? []}
                keywords={material?.analysis?.keywords}
                compact
              />
            )}
            {sidebarTab === "mindmap" && (
              <InteractiveMindmapFlow
                tree={mindmapTree}
                materialId={material?.id}
                compact
                annotations={annotations}
                onAnnotationsChange={refreshAnnotations}
              />
            )}
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
