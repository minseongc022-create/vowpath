/**
 * 진단 전용(임시) — getItemView 실제 응답 모양을 뜬다.
 *
 * ★ 왜 필요한가
 *
 * 상세페이지에 사진이 한 장뿐이고 반품 주소·이미지 사용 허가 문구를
 * 못 읽는 건 필드명을 추측해서 파싱하다 틀렸을 가능성이 크다 — 이
 * 프로젝트에서 이미 두 번(MOQ, 검색 응답 문자열 숫자) 같은 패턴으로
 * 사고가 났다. 추측 대신 실제 응답을 한 번 떠서 진짜 필드명을 본다.
 *
 * 확인 끝나면 이 라우트는 지운다.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const aid = process.env.DOMEGGOOK_API_KEY?.trim();
  if (!aid) return NextResponse.json({ error: "DOMEGGOOK_API_KEY not configured" }, { status: 503 });

  const url = new URL(request.url);
  const no = url.searchParams.get("no") ?? "9502515";

  const params = new URLSearchParams({ ver: "4.6", mode: "getItemView", aid, no, om: "json" });
  const res = await fetch(`https://www.domeggook.com/ssl/api/?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => {
    throw new Error(`fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  });

  const text = await res.text();
  return NextResponse.json({ status: res.status, no, body: text.slice(0, 12000) });
}
