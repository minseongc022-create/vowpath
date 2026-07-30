import { NextResponse } from "next/server";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export const maxDuration = 30;

const ALLOWED_HOST_RE =
  /(^|\.)(alicdn\.com|tbcdn\.cn|taobaocdn\.com|1688\.com|alibaba\.com|aliyuncs\.com)$/i;

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

  try {
    const res = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.1688.com/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `이미지 로드 실패 (${res.status})` }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "이미지가 아닙니다." }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "이미지 프록시 실패" }, { status: 502 });
  }
}
