import { NextResponse } from "next/server";
import { upgradeCdnUrl } from "@/lib/sourcing-detail/extract-images";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export const maxDuration = 30;

const ALLOWED_HOST_RE =
  /(^|\.)(alicdn\.com|tbcdn\.cn|taobaocdn\.com|1688\.com|alibaba\.com|aliyuncs\.com)$/i;

const IMAGE_HEADERS: Record<string, string>[] = [
  {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://www.1688.com/",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  },
  {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    Referer: "https://m.1688.com/",
    Accept: "image/*",
  },
  {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://detail.1688.com/",
    Accept: "image/*",
  },
  {
    "User-Agent": "MatchCut/1.0",
    Accept: "image/*",
  },
];

function isAllowedImageUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!ALLOWED_HOST_RE.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

function candidateUrls(raw: string): string[] {
  const upgraded = upgradeCdnUrl(raw);
  const urls = new Set<string>([raw, upgraded]);
  // Strip resize suffixes that sometimes 403 from overseas IPs
  const stripped = upgraded
    .replace(/_sum\.jpg$/i, ".jpg")
    .replace(/\.jpg_\d+x\d+[^.]*\.jpg$/i, ".jpg")
    .replace(/_\.webp$/i, "");
  if (stripped !== upgraded) urls.add(stripped);
  return [...urls];
}

async function fetchImageBytes(url: string): Promise<{ buf: ArrayBuffer; contentType: string } | null> {
  for (const urlVariant of candidateUrls(url)) {
    for (const headers of IMAGE_HEADERS) {
      try {
        const res = await fetch(urlVariant, {
          headers,
          signal: AbortSignal.timeout(15_000),
          redirect: "follow",
        });
        if (!res.ok) continue;
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) continue;
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 500) continue;
        return { buf, contentType };
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/** Proxy marketplace CDN images so mobile browsers can display hotlink-protected assets. */
export async function GET(request: Request) {
  try {
    await requireMatchCutSession();
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url") ?? "";
  const target = isAllowedImageUrl(raw);
  if (!target) {
    return NextResponse.json({ error: "허용되지 않은 이미지 URL" }, { status: 400 });
  }

  const fetched = await fetchImageBytes(target.toString());
  if (!fetched) {
    return NextResponse.json({ error: "이미지 로드 실패 (해외 CDN 차단)" }, { status: 502 });
  }

  return new NextResponse(fetched.buf, {
    status: 200,
    headers: {
      "Content-Type": fetched.contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
