import type { SourcingPlatform } from "./types";

const PLATFORM_PATTERNS: { platform: SourcingPlatform; patterns: RegExp[] }[] = [
  {
    platform: "1688",
    patterns: [/1688\.com/i, /detail\.1688\.com/i, /qr\.1688\.com/i, /m\.1688\.com/i],
  },
  {
    platform: "taobao",
    patterns: [/taobao\.com/i, /tmall\.com/i],
  },
  {
    platform: "aliexpress",
    patterns: [/aliexpress\.com/i],
  },
];

/** 1688 공유 문구의 【상품명】 추출 */
export function extractShareTitle(raw: string): string | undefined {
  const m = String(raw ?? "").match(/【\s*([^】]+?)\s*】/);
  const title = m?.[1]?.trim();
  if (!title) return undefined;
  // 너무 짧은 토큰/코드 제외
  if (title.length < 2) return undefined;
  return title;
}

/** Extract first http(s) URL from pasted share text (모바일 알리 공유 문구 등) */
export function extractUrlFromPaste(raw: string): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  // Prefer known marketplace hosts
  const preferred =
    text.match(
      /https?:\/\/(?:[\w.-]+\.)?(?:1688|taobao|tmall|aliexpress)\.com\/[^\s<>"']+/i,
    ) ?? text.match(/https?:\/\/[^\s<>"']+/i);

  if (!preferred) return null;

  let url = preferred[0]!;
  // Trim trailing punctuation / fullwidth junk common in share pastes
  url = url.replace(/[)\]】>,，。．\s]+$/g, "");
  return url;
}

export function detectPlatform(url: string): SourcingPlatform {
  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    if (patterns.some((p) => p.test(url))) return platform;
  }
  return "unknown";
}

/**
 * Accepts either a clean URL or a mobile share paste that contains a URL.
 * Example 1688 share:
 * 【상품명】复制￥xxx￥...查看：https://qr.1688.com/s/xxxxx
 */
export function normalizeListingUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";

  // Direct URL
  try {
    return new URL(trimmed).toString();
  } catch {
    /* fall through — maybe share paste */
  }

  const extracted = extractUrlFromPaste(trimmed);
  if (!extracted) return "";

  try {
    return new URL(extracted).toString();
  } catch {
    return extracted;
  }
}

export function isSupportedListingUrl(url: string): boolean {
  const platform = detectPlatform(url);
  return platform !== "unknown";
}
