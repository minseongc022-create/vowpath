export type DemoLesson = {
  id: string;
  slug: string;
  title: string;
  description: string;
  videoUrl: string | null;
  durationSec: number;
  sortOrder: number;
};

export type DemoCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string | null;
  lessons: DemoLesson[];
};

export type DemoMindmapNode = {
  id: string;
  label: string;
  summary?: string;
  children?: DemoMindmapNode[];
};

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: "demo-ai-fundamentals",
    slug: "ai-fundamentals",
    title: "AI 기초 — 초밀착 학습",
    description:
      "AI 에이전트가 실시간으로 커리큘럼을 조정하며, 당신의 학습 속도에 맞춰 성장합니다.",
    thumbnail: null,
    lessons: [
      {
        id: "demo-lesson-1",
        slug: "intro",
        title: "1강. AI 학습 에이전트란?",
        description:
          "EFFIROAD가 Class101, 오르조와 어떻게 다른지 — iPad 가로 모드까지 완벽하게 설계된 학습 경험을 소개합니다.",
        videoUrl: null,
        durationSec: 720,
        sortOrder: 1,
      },
      {
        id: "demo-lesson-2",
        slug: "mindmap",
        title: "2강. 실시간 마인드맵 활용법",
        description:
          "강의를 보면서 우측 사이드바의 마인드맵이 어떻게 자동으로 업데이트되는지 알아봅니다.",
        videoUrl: null,
        durationSec: 540,
        sortOrder: 2,
      },
      {
        id: "demo-lesson-3",
        slug: "sync",
        title: "3강. 모든 기기에서 동기화",
        description:
          "카카오·구글 로그인 한 번으로 폰, 패드, PC에서 필기와 플래너가 실시간 동기화됩니다.",
        videoUrl: null,
        durationSec: 480,
        sortOrder: 3,
      },
    ],
  },
  {
    id: "demo-product-design",
    slug: "product-design",
    title: "토스급 UX 디자인",
    description: "복잡한 기능도 한 번의 터치로. 편안한 학습 UX 설계 원칙.",
    thumbnail: null,
    lessons: [
      {
        id: "demo-lesson-4",
        slug: "simplicity",
        title: "1강. 단순함의 힘",
        description: "토스처럼 편한 UI를 만드는 핵심 원칙.",
        videoUrl: null,
        durationSec: 600,
        sortOrder: 1,
      },
    ],
  },
];

export const DEMO_MINDMAP: DemoMindmapNode[] = [
  {
    id: "root",
    label: "AI 학습 에이전트",
    summary: "EFFIROAD 핵심 개념",
    children: [
      {
        id: "layout",
        label: "YouTube형 레이아웃",
        summary: "영상 중앙 + 사이드바",
        children: [
          { id: "video", label: "영상/자료 영역" },
          { id: "sidebar", label: "마인드맵 & 커리큘럼" },
        ],
      },
      {
        id: "sync",
        label: "실시간 동기화",
        summary: "Supabase + Prisma",
        children: [
          { id: "notes", label: "필기" },
          { id: "planner", label: "플래너" },
        ],
      },
      {
        id: "auth",
        label: "통합 로그인",
        children: [
          { id: "kakao", label: "카카오" },
          { id: "google", label: "구글" },
        ],
      },
    ],
  },
];

export function getDemoCourse(slug: string): DemoCourse | undefined {
  return DEMO_COURSES.find((c) => c.slug === slug);
}

export function getDemoLesson(courseSlug: string, lessonSlug: string) {
  const course = getDemoCourse(courseSlug);
  if (!course) return undefined;
  const lesson = course.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) return undefined;
  return { course, lesson };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
