import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 일회성 진단 — 도매꾹이 왜 모든 검색어에 0개를 주는가
 *
 * 키는 설정돼 있고(그랬으면 "API 키 미설정"이 떴을 것) API 오류도 안 잡히는데,
 * 검색어 24개가 전부 상품 0개다. 수백만 개짜리 도매 마켓에서 서로 다른 검색어
 * 24개가 진짜로 전부 0건일 수는 없다 — 응답을 우리가 잘못 읽고 있거나,
 * 도매꾹이 우리가 안 잡는 형태로 거절하고 있다는 뜻이다.
 *
 * 추측으로 파서를 고치면 또 틀린다. **응답 원문을 직접 본다.**
 * 확인이 끝나면 이 라우트는 지운다. CRON_SECRET로만 연다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const aid = process.env.DOMEGGOOK_API_KEY?.trim();
  if (!aid) {
    return NextResponse.json({ error: "DOMEGGOOK_API_KEY 없음" }, { status: 200 });
  }

  const keyword = new URL(request.url).searchParams.get("kw") ?? "보조배터리";
  const API_BASE = "https://www.domeggook.com/ssl/api/";

  /** 한 조합을 실제로 불러 응답 원문 앞부분을 그대로 돌려준다 */
  async function probe(label: string, params: Record<string, string>) {
    const qs = new URLSearchParams({ ver: "4.1", mode: "getItemList", aid: aid!, om: "json", ...params });
    const url = `${API_BASE}?${qs.toString()}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      const text = await res.text();
      let topKeys: string[] = [];
      let nested: string[] = [];
      try {
        const j = JSON.parse(text) as Record<string, unknown>;
        topKeys = Object.keys(j);
        // 껍질이 한 겹 더 있는 구조라 안쪽 키도 같이 본다
        for (const k of topKeys) {
          const v = j[k];
          if (v && typeof v === "object") nested.push(`${k}:{${Object.keys(v as object).join(",")}}`);
        }
      } catch {
        /* JSON이 아니면 원문으로 판단한다 */
      }
      return {
        label,
        // 키는 절대 로그에 남기지 않는다 — aid를 지운 주소만 남긴다
        url: url.replace(aid!, "***"),
        httpStatus: res.status,
        contentType: res.headers.get("content-type"),
        topKeys,
        nested,
        bodyHead: text.slice(0, 700),
      };
    } catch (e) {
      return { label, url: url.replace(aid!, "***"), error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 지금 코드가 실제로 쓰는 조합부터, 하나씩 빼가며 무엇이 0을 만드는지 좁힌다
  const results = [
    await probe("지금 코드 그대로 (dome·so=qa·mnq/mxq)", {
      market: "dome", kw: keyword, sz: "20", pg: "1", so: "qa", mnq: "1", mxq: "1",
    }),
    await probe("MOQ 필터만 뺌 (dome·so=qa)", {
      market: "dome", kw: keyword, sz: "20", pg: "1", so: "qa",
    }),
    await probe("정렬도 뺌 (dome만)", {
      market: "dome", kw: keyword, sz: "20", pg: "1",
    }),
    await probe("market도 뺌 (가장 단순)", {
      kw: keyword, sz: "20", pg: "1",
    }),
    await probe("도매매(supply) 시장", {
      market: "supply", kw: keyword, sz: "20", pg: "1",
    }),
  ];

  return NextResponse.json({ ok: true, keyword, results }, { status: 200 });
}
