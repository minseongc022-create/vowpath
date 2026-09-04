/**
 * 하루위드 테마 — 사용자가 앱 색을 직접 고른다.
 *
 * 각 테마는 오로라처럼 흐르는 그라데이션 한 벌이다. 여기 있는 swatch/dot 값은 테마 선택
 * 모달이 그대로 그리고, 실제 앱에 칠해지는 변수는 styles/theme.css의 같은 id 블록이 갖는다
 * (둘이 같은 색을 쓰도록 항상 함께 고친다 — 고르는 색과 칠해지는 색이 달라지면 안 된다).
 */

export type DajeongThemeId = "sky" | "peach" | "lavender" | "mint" | "ocean" | "sunset" | "forest" | "night";

export type DajeongTheme = {
  id: DajeongThemeId;
  name: string;
  description: string;
  /** 이름 옆 점 — 테마의 대표 단색 */
  dot: string;
  /** 선택 카드에 그려지는 오로라 그라데이션 */
  swatch: string;
};

export const DEFAULT_DAJEONG_THEME: DajeongThemeId = "sky";
export const DAJEONG_THEME_STORAGE_KEY = "dajeong:theme";

export const DAJEONG_THEMES: DajeongTheme[] = [
  {
    id: "sky",
    name: "하늘",
    description: "맑고 편안한 하루",
    dot: "#6aa6e8",
    swatch:
      "radial-gradient(120% 95% at 8% 12%, #e9f1ff 0%, rgba(233,241,255,0) 62%)," +
      "radial-gradient(105% 88% at 92% 22%, #cddcff 0%, rgba(205,220,255,0) 66%)," +
      "radial-gradient(120% 110% at 72% 96%, #d9ccf7 0%, rgba(217,204,247,0) 70%)," +
      "linear-gradient(128deg, #eaf3ff 0%, #cfe0fb 46%, #d6d3f8 100%)",
  },
  {
    id: "peach",
    name: "피치",
    description: "따뜻한 설렘",
    dot: "#ff7f6d",
    swatch:
      "radial-gradient(120% 95% at 10% 10%, #ffe4d8 0%, rgba(255,228,216,0) 60%)," +
      "radial-gradient(110% 90% at 88% 26%, #ffc0b6 0%, rgba(255,192,182,0) 66%)," +
      "radial-gradient(120% 110% at 70% 98%, #ffb2c2 0%, rgba(255,178,194,0) 70%)," +
      "linear-gradient(128deg, #ffe9e0 0%, #ffbcae 48%, #ff9fae 100%)",
  },
  {
    id: "lavender",
    name: "라벤더",
    description: "차분한 감성",
    dot: "#a97ae0",
    swatch:
      "radial-gradient(120% 95% at 10% 12%, #f2e6ff 0%, rgba(242,230,255,0) 60%)," +
      "radial-gradient(110% 90% at 90% 24%, #dcc4f8 0%, rgba(220,196,248,0) 66%)," +
      "radial-gradient(120% 110% at 68% 98%, #ffd2ee 0%, rgba(255,210,238,0) 70%)," +
      "linear-gradient(128deg, #f4e9ff 0%, #dcc2f6 48%, #cbb6f4 100%)",
  },
  {
    id: "mint",
    name: "민트",
    description: "산뜻한 에너지",
    dot: "#37c9ae",
    swatch:
      "radial-gradient(120% 95% at 10% 12%, #e2fff6 0%, rgba(226,255,246,0) 60%)," +
      "radial-gradient(110% 90% at 90% 24%, #a8f0dd 0%, rgba(168,240,221,0) 66%)," +
      "radial-gradient(120% 110% at 70% 98%, #b6ecff 0%, rgba(182,236,255,0) 70%)," +
      "linear-gradient(128deg, #e4fff8 0%, #9fecd8 48%, #86e4d6 100%)",
  },
  {
    id: "ocean",
    name: "바다",
    description: "시원한 몰입",
    dot: "#2b8ed6",
    swatch:
      "radial-gradient(120% 100% at 14% 6%, #4fc3f7 0%, rgba(79,195,247,0) 58%)," +
      "radial-gradient(115% 95% at 86% 30%, #1769c8 0%, rgba(23,105,200,0) 64%)," +
      "radial-gradient(130% 120% at 62% 100%, #35a7e8 0%, rgba(53,167,232,0) 68%)," +
      "linear-gradient(126deg, #2e9bdf 0%, #1a6ec6 52%, #17509f 100%)",
  },
  {
    id: "sunset",
    name: "노을",
    description: "따뜻한 여운",
    dot: "#ff7f5c",
    swatch:
      "radial-gradient(120% 100% at 12% 8%, #ffd28a 0%, rgba(255,210,138,0) 58%)," +
      "radial-gradient(115% 95% at 88% 26%, #ff7a6a 0%, rgba(255,122,106,0) 64%)," +
      "radial-gradient(130% 120% at 64% 100%, #ff9d7a 0%, rgba(255,157,122,0) 68%)," +
      "linear-gradient(126deg, #ffb072 0%, #ff8168 52%, #f4676f 100%)",
  },
  {
    id: "forest",
    name: "숲",
    description: "편안한 안정",
    dot: "#3f9d63",
    swatch:
      "radial-gradient(120% 100% at 14% 10%, #9fe6a8 0%, rgba(159,230,168,0) 56%)," +
      "radial-gradient(115% 95% at 86% 28%, #2f7d55 0%, rgba(47,125,85,0) 64%)," +
      "radial-gradient(130% 120% at 60% 100%, #6bc98d 0%, rgba(107,201,141,0) 68%)," +
      "linear-gradient(126deg, #66c78a 0%, #3d9a66 52%, #2b7350 100%)",
  },
  {
    id: "night",
    name: "밤하늘",
    description: "차분한 집중",
    dot: "#3b3f80",
    swatch:
      "radial-gradient(120% 100% at 16% 8%, #5a5fae 0%, rgba(90,95,174,0) 56%)," +
      "radial-gradient(115% 95% at 86% 30%, #2a2d63 0%, rgba(42,45,99,0) 64%)," +
      "radial-gradient(130% 120% at 58% 100%, #7f6fc4 0%, rgba(127,111,196,0) 66%)," +
      "linear-gradient(126deg, #3b3f86 0%, #262a5f 54%, #1a1c42 100%)",
  },
];

export function isDajeongThemeId(value: unknown): value is DajeongThemeId {
  return typeof value === "string" && DAJEONG_THEMES.some((theme) => theme.id === value);
}

export function dajeongTheme(id: DajeongThemeId): DajeongTheme {
  return DAJEONG_THEMES.find((theme) => theme.id === id) ?? DAJEONG_THEMES[0];
}
