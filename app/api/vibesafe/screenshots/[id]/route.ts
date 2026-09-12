import { NextResponse } from "next/server";
import { prisma } from "@/vibesafe/lib/db";
import { requireSession } from "@/vibesafe/lib/http";

/**
 * 실패 화면 이미지.
 *
 * ★ 이미지도 남의 앱 화면이다 — 로그인된 상태의 개인정보가 찍혀 있을 수 있다.
 *   그래서 세션 + 소유권 확인을 거치고, 캐시는 private으로만 허용한다.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (!auth.ok) return new NextResponse(null, { status: 401 });

  const { id } = await context.params;
  const shot = await prisma.vibesafeScreenshot.findUnique({
    where: { id },
    select: { projectId: true, contentType: true, data: true },
  });
  if (!shot) return new NextResponse(null, { status: 404 });

  const owned = await prisma.vibesafeProject.findFirst({
    where: { id: shot.projectId, userId: auth.session.userId },
    select: { id: true },
  });
  if (!owned) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(shot.data, "base64"), {
    headers: {
      "Content-Type": shot.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export const dynamic = "force-dynamic";
