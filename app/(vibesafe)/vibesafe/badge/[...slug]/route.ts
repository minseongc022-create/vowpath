import { NextResponse } from "next/server";
import { badgeForStatus, getPublicStatus, renderBadgeSvg } from "@/vibesafe/lib/public-status";

/**
 * README 배지.
 *
 * ★ 왜 로그인이 필요 없는가
 *
 * 배지는 GitHub의 이미지 프록시가 가져간다 — 사용자의 쿠키가 없다. 그래서
 * 공개 상태를 켠 프로젝트만, 추측 불가능한 slug로만 접근된다.
 *
 * ★ 캐시를 짧게 잡는 이유
 *
 * GitHub은 README 이미지를 자기 프록시에 캐시한다. 너무 길게 잡으면 "정상"
 * 배지가 떠 있는데 실제로는 깨져 있는 상태가 오래간다 — 그건 이 제품이
 * 팔려는 것과 정반대다.
 */
export async function GET(_request: Request, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  const clean = (slug ?? []).join("/").replace(/\.svg$/, "");

  const status = clean ? await getPublicStatus(clean) : null;
  const badge = badgeForStatus(status);

  return new NextResponse(renderBadgeSvg(badge), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}

export const dynamic = "force-dynamic";
