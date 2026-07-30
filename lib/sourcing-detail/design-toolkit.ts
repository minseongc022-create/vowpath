import type { ProductAnalysis, ProductCategory } from "./product-analysis";

export type DesignToolkit = {
  id: string;
  label: string;
  fontStack: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  heroGradient: string;
  radius: string;
  sectionTitleStyle: string;
  featureStyle: "checks" | "numbered" | "pills";
  moodNote: string;
};

const TOOLKITS: Record<ProductCategory, DesignToolkit> = {
  fashion: {
    id: "atelier",
    label: "아틀리에",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#f6f4f1",
    surface: "#ffffff",
    text: "#1a1a1a",
    muted: "#6b6560",
    accent: "#1a1a1a",
    accentSoft: "#ebe6df",
    heroGradient: "linear-gradient(160deg, #1a1a1a 0%, #3d3a36 100%)",
    radius: "4px",
    sectionTitleStyle: "letter-spacing:0.08em; text-transform:uppercase; font-size:0.78rem;",
    featureStyle: "numbered",
    moodNote: "패션·편집숍 무드 — 여백과 타이포",
  },
  electronics: {
    id: "precision",
    label: "프리시전",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#0b1220",
    surface: "#121a2b",
    text: "#e8eefc",
    muted: "#93a4c3",
    accent: "#3b82f6",
    accentSoft: "#1e3a5f",
    heroGradient: "linear-gradient(135deg, #0b1220 0%, #1e3a8a 100%)",
    radius: "12px",
    sectionTitleStyle: "font-weight:800; letter-spacing:-0.02em;",
    featureStyle: "checks",
    moodNote: "가전·디지털 — 다크 테크 패널",
  },
  home: {
    id: "hearth",
    label: "하스",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#f3f7f4",
    surface: "#ffffff",
    text: "#1c2b24",
    muted: "#5f7268",
    accent: "#0f766e",
    accentSoft: "#d1fae5",
    heroGradient: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
    radius: "16px",
    sectionTitleStyle: "font-weight:700;",
    featureStyle: "checks",
    moodNote: "홈리빙 — 따뜻한 그린·크림",
  },
  beauty: {
    id: "glow",
    label: "글로우",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#fff7fb",
    surface: "#ffffff",
    text: "#3b1028",
    muted: "#8a5a74",
    accent: "#be185d",
    accentSoft: "#fce7f3",
    heroGradient: "linear-gradient(145deg, #9d174d 0%, #db2777 55%, #f9a8d4 100%)",
    radius: "20px",
    sectionTitleStyle: "font-weight:700; letter-spacing:-0.01em;",
    featureStyle: "pills",
    moodNote: "뷰티 — 소프트 핑크 글로우",
  },
  sports: {
    id: "volt",
    label: "볼트",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#f7f7f5",
    surface: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    accent: "#ea580c",
    accentSoft: "#ffedd5",
    heroGradient: "linear-gradient(135deg, #111827 0%, #ea580c 100%)",
    radius: "10px",
    sectionTitleStyle: "font-weight:800; text-transform:uppercase; letter-spacing:0.04em; font-size:0.85rem;",
    featureStyle: "numbered",
    moodNote: "스포츠 — 다크×오렌지 에너지",
  },
  kids: {
    id: "play",
    label: "플레이",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#f5f3ff",
    surface: "#ffffff",
    text: "#2e1065",
    muted: "#6d28d9",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    heroGradient: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    radius: "18px",
    sectionTitleStyle: "font-weight:800;",
    featureStyle: "pills",
    moodNote: "키즈 — 밝고 친근한 퍼플",
  },
  food: {
    id: "table",
    label: "테이블",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#fffbeb",
    surface: "#ffffff",
    text: "#451a03",
    muted: "#92400e",
    accent: "#b45309",
    accentSoft: "#fde68a",
    heroGradient: "linear-gradient(145deg, #78350f 0%, #b45309 100%)",
    radius: "14px",
    sectionTitleStyle: "font-weight:700;",
    featureStyle: "checks",
    moodNote: "푸드 — 앰버·식탁 무드",
  },
  accessories: {
    id: "facet",
    label: "파셋",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#f0f9ff",
    surface: "#ffffff",
    text: "#0c4a6e",
    muted: "#0369a1",
    accent: "#0891b2",
    accentSoft: "#cffafe",
    heroGradient: "linear-gradient(135deg, #0e7490 0%, #22d3ee 100%)",
    radius: "12px",
    sectionTitleStyle: "font-weight:700; letter-spacing:-0.01em;",
    featureStyle: "checks",
    moodNote: "액세서리 — 시원한 시안 톤",
  },
  generic: {
    id: "trust",
    label: "트러스트",
    fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
    bg: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    accent: "#3182F6",
    accentSoft: "#dbeafe",
    heroGradient: "linear-gradient(135deg, #1d4ed8 0%, #3182F6 100%)",
    radius: "16px",
    sectionTitleStyle: "font-weight:700;",
    featureStyle: "checks",
    moodNote: "범용 — 신뢰 블루",
  },
};

export function resolveDesignToolkit(analysis?: ProductAnalysis): DesignToolkit {
  const category = analysis?.category ?? "generic";
  const base = TOOLKITS[category] ?? TOOLKITS.generic;
  // Style tweak by detailStyle
  if (analysis?.detailStyle === "minimal") {
    return { ...base, radius: "2px", moodNote: `${base.moodNote} · 미니멀` };
  }
  if (analysis?.detailStyle === "value") {
    return { ...base, moodNote: `${base.moodNote} · 가성비 직설` };
  }
  return base;
}
