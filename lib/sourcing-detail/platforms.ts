import type { SourcingPlatform } from "./types";

const PLATFORM_PATTERNS: { platform: SourcingPlatform; patterns: RegExp[] }[] = [
  {
    platform: "1688",
    patterns: [/1688\.com/i, /detail\.1688\.com/i],
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

export function detectPlatform(url: string): SourcingPlatform {
  for (const { platform, patterns } of PLATFORM_PATTERNS) {
    if (patterns.some((p) => p.test(url))) return platform;
  }
  return "unknown";
}

export function normalizeListingUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function isSupportedListingUrl(url: string): boolean {
  const platform = detectPlatform(url);
  return platform !== "unknown";
}
