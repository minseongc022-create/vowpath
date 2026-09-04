import "server-only";

import type { DiscoveryItem, DiscoverySource } from "./types";

/**
 * "요즘 뜨는 것"을 합법적인 공식 출처에서만 가져온다.
 *
 * 인스타·SNS를 긁는 방법은 쓰지 않는다. 메타는 몇 년 전부터 제3자가 남의 공개 게시물을
 * 검색·수집할 수 있는 API를 닫았고, 그걸 우회하는 건 이용약관 위반이다. 대신 두 갈래를 쓴다.
 *
 *   1) 기관 데이터(문화데이터광장·서울 열린데이터광장)
 *      전시·공연·축제의 기간이 시작일~종료일로 등록돼 있다. "며칠만 하는 것"을 정확히 아는
 *      유일한 경로라, 여기서 온 날짜만 화면에서 단정한다.
 *
 *   2) 네이버 검색 API(지역·블로그) — NAVER API HUB
 *      아직 기관 데이터에 없는 신상 가게는 "최근에 블로그 글이 몰린다"는 신호로만 추린다.
 *      이건 추정이라 confidence: "inferred" 로 표시하고, 기간·가격을 지어내지 않는다.
 *      네이버가 예전 개발자센터(openapi.naver.com)에서 검색 API를 빼서 NAVER Cloud
 *      Platform의 API HUB(naverapihub.apigw.ntruss.com)로 옮겼다. 인증 헤더도
 *      X-Naver-Client-Id → X-NCP-APIGW-API-KEY-ID 로 바뀌었다. 응답 필드명은
 *      title/link/description/postdate(블로그), title/address/mapx/mapy(지역)로 유지된다.
 *
 * 키가 없으면 각 함수는 조용히 빈 배열을 준다 — 카카오·구글 탐색과 같은 방식이라,
 * 키를 넣기 전에도 앱은 그대로 돌고 넣는 순간 켜진다.
 */

export function cultureDataKey(): string | null {
  return process.env.CULTURE_DATA_API_KEY?.trim() || null;
}

export function seoulOpenDataKey(): string | null {
  return process.env.SEOUL_OPEN_DATA_API_KEY?.trim() || null;
}

export function naverSearchCredentials(): { id: string; secret: string } | null {
  const id = process.env.NAVER_SEARCH_CLIENT_ID?.trim();
  const secret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

export function discoverySourcesConfigured(): boolean {
  return Boolean(cultureDataKey() || seoulOpenDataKey() || naverSearchCredentials());
}

/** 네이버는 검색어 일치 부분을 <b>로 감싸서 준다. 그대로 화면에 뿌리면 태그가 글자로 보인다. */
function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

/**
 * 응답에서 값을 꺼낼 때 이름 후보를 여러 개 받는다.
 *
 * 기관 API의 정확한 필드명은 키를 발급받아 실제 응답을 보기 전에는 확정할 수 없다.
 * 하나만 찍어두면 이름이 다를 때 전부 undefined가 되어 조용히 빈 결과가 되므로,
 * 알려진 후보를 순서대로 보고 먼저 잡히는 걸 쓴다. 그래도 없으면 그 항목은 버린다 —
 * 반쯤 빈 항목을 만들어 화면에 내보내지 않는다.
 */
function pick(record: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = record[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * 의존성 없이 <item> 블록만 뽑아내는 최소 XML 리더.
 *
 * data.go.kr 계열은 대부분 XML로 답한다. 전체 XML 스펙을 구현할 이유는 없고, 한 겹짜리
 * 필드만 읽으면 충분하다. 응답이 JSON이면 그쪽으로 넘긴다.
 */
function parseItems(body: string): Record<string, string>[] {
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      return collectJsonItems(json);
    } catch {
      return [];
    }
  }
  const items: Record<string, string>[] = [];
  for (const block of trimmed.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const record: Record<string, string> = {};
    for (const field of block[1].matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)) {
      record[field[1]] = field[2].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    }
    if (Object.keys(record).length) items.push(record);
  }
  return items;
}

/** JSON 응답은 기관마다 감싸는 깊이가 달라, 문자열 값만 가진 객체 배열을 찾아 들어간다. */
function collectJsonItems(node: unknown, depth = 0): Record<string, string>[] {
  if (depth > 6 || node == null) return [];
  if (Array.isArray(node)) {
    const rows = node.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
    if (rows.length) {
      return rows.map((row) => Object.fromEntries(
        Object.entries(row)
          .filter(([, value]) => typeof value === "string" || typeof value === "number")
          .map(([key, value]) => [key, String(value)]),
      ));
    }
    return node.flatMap((entry) => collectJsonItems(entry, depth + 1));
  }
  if (typeof node === "object") {
    return Object.values(node as Record<string, unknown>).flatMap((value) => collectJsonItems(value, depth + 1));
  }
  return [];
}

async function fetchText(url: string, headers: Record<string, string> = {}, timeoutMs = 8_000): Promise<string | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json, application/xml;q=0.9, */*;q=0.8", ...headers }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function yyyymmdd(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

/** "20261115" / "2026-11-15" 를 모두 ISO 날짜로 맞춘다. 못 읽으면 undefined — 짐작하지 않는다. */
function isoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return undefined;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return Number.isNaN(new Date(iso).getTime()) ? undefined : iso;
}

function coordinate(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return undefined;
  // 네이버 지역 검색은 좌표를 1e7 곱한 정수로 준다. 한국 위경도는 그 범위를 넘지 않는다.
  return Math.abs(parsed) > 1_000 ? parsed / 1e7 : parsed;
}

/**
 * 문화데이터광장 — 공연·전시 기간 조회.
 *
 * 기간이 겹치는 항목만 돌려주므로, "지금부터 N일 안에 하는 것"을 그대로 물어볼 수 있다.
 */
export async function fetchCultureEvents(params: {
  /** 이 좌표를 중심으로 반경만 요청한다 — 없으면 전국을 뒤진다. */
  near?: { latitude: number; longitude: number };
  /** near의 반경(km). API가 사각형 범위(gpsxfrom~to)로 받기 때문에 근사치다. */
  radiusKm?: number;
  keyword?: string;
  withinDays?: number;
  limit?: number;
}): Promise<DiscoveryItem[]> {
  const serviceKey = cultureDataKey();
  if (!serviceKey) return [];

  const now = new Date();
  const until = new Date(now.getTime() + (params.withinDays ?? 30) * 86_400_000);
  const search = new URLSearchParams({
    from: yyyymmdd(now),
    to: yyyymmdd(until),
    cPage: "1",
    rows: String(Math.min(100, (params.limit ?? 20) * 3)),
    sortStdr: "1",
  });
  if (params.keyword?.trim()) search.set("keyword", params.keyword.trim());
  // 이름으로는 안 된다 — "광화문"으로 걸면 실제로는 "경복궁"으로 등록된 근처 행사가 통째로
  // 걸러진다. 대신 이 API가 지원하는 좌표 사각형 범위(gpsxfrom~gpsyto)로 지역을 좁힌다.
  // 위도 1도 ≈ 111km 이므로 반경(km)을 도 단위로 환산해 사각형을 만든다.
  if (params.near) {
    const radiusDeg = (params.radiusKm ?? 8) / 111;
    search.set("gpsxfrom", String(params.near.longitude - radiusDeg));
    search.set("gpsxto", String(params.near.longitude + radiusDeg));
    search.set("gpsyfrom", String(params.near.latitude - radiusDeg));
    search.set("gpsyto", String(params.near.latitude + radiusDeg));
  }

  // serviceKey는 이미 인코딩된 형태로 발급되는 경우가 많아 URLSearchParams에 넣지 않고 직접 붙인다.
  // 공식 명칭: 한국문화정보원_한눈에보는문화정보조회서비스. 문화데이터광장(culture.go.kr)이 아니라
  // 공공데이터포털(data.go.kr)에서 신청하는 서비스라, 엔드포인트도 그쪽 규격을 따른다.
  const url = `https://apis.data.go.kr/B553457/cultureinfo/period2?${search.toString()}&serviceKey=${serviceKey}`;
  const body = await fetchText(url);
  if (!body) return [];

  const checkedAt = new Date().toISOString();
  const items: DiscoveryItem[] = [];
  for (const record of parseItems(body)) {
    const title = pick(record, "title", "TITLE", "name");
    if (!title) continue;
    const startDate = isoDate(pick(record, "startDate", "START_DATE", "startdate", "period"));
    const endDate = isoDate(pick(record, "endDate", "END_DATE", "enddate"));
    const place = pick(record, "place", "PLACE", "spatial", "venue");
    const area = pick(record, "area", "AREA", "sido");
    items.push({
      id: `culture-${pick(record, "seq", "SEQ", "id") ?? `${title}-${startDate ?? ""}`}`,
      title: stripTags(title),
      source: "culture_data",
      sourceLabel: "문화데이터광장 등록 정보",
      // 기관이 등록한 기간이라 날짜를 그대로 말해도 된다.
      confidence: "official",
      startDate,
      endDate,
      place,
      region: area,
      latitude: coordinate(pick(record, "gpsY", "GPSY", "latitude")),
      longitude: coordinate(pick(record, "gpsX", "GPSX", "longitude")),
      category: pick(record, "realmName", "REALM_NAME", "genre"),
      summary: pick(record, "subTitle", "SUBTITLE", "contents1", "description"),
      imageUrl: pick(record, "thumbnail", "THUMBNAIL", "imgUrl"),
      detailsUrl: pick(record, "url", "URL", "referenceIdentifier"),
      signals: [],
      checkedAt,
    });
    if (items.length >= (params.limit ?? 20)) break;
  }
  return items;
}

/**
 * 네이버 지역 검색 — 아직 기관 데이터에 없는 실제 가게.
 *
 * 카카오·구글이 놓치는 신상 가게를 보강하는 용도다. 이 API는 평점을 주지 않으므로
 * "좋은 곳"이라는 판단의 근거로 쓰지 않는다. 존재와 위치만 가져온다.
 */
export async function fetchNaverLocal(params: { query: string; limit?: number }): Promise<DiscoveryItem[]> {
  const credentials = naverSearchCredentials();
  const query = params.query.trim();
  if (!credentials || !query) return [];

  // 지역 검색은 display 최대가 5다. 더 달라고 하면 오류로 돌아온다.
  const search = new URLSearchParams({ query, display: String(Math.min(5, params.limit ?? 5)), sort: "comment" });
  const body = await fetchText(`https://naverapihub.apigw.ntruss.com/search/v1/local?${search.toString()}`, {
    "X-NCP-APIGW-API-KEY-ID": credentials.id,
    "X-NCP-APIGW-API-KEY": credentials.secret,
  });
  if (!body) return [];

  const checkedAt = new Date().toISOString();
  const items: DiscoveryItem[] = [];
  for (const record of parseItems(body)) {
    const title = pick(record, "title");
    const address = pick(record, "roadAddress", "address");
    if (!title || !address) continue;
    items.push({
      id: `naver-local-${stripTags(title)}-${address}`,
      title: stripTags(title),
      source: "naver_local",
      sourceLabel: "네이버 지역 등록 정보",
      // 등록된 가게라는 사실은 확실하다. 다만 "요즘 뜬다"는 뜻은 아니다.
      confidence: "official",
      place: stripTags(title),
      address,
      latitude: coordinate(pick(record, "mapy")),
      longitude: coordinate(pick(record, "mapx")),
      category: pick(record, "category"),
      summary: pick(record, "description") ? stripTags(record.description) : undefined,
      detailsUrl: pick(record, "link"),
      signals: [],
      checkedAt,
    });
  }
  return items;
}

/**
 * 네이버 블로그 검색 — "요즘 화제"를 추정하는 신호.
 *
 * 최신순으로 받아, 최근 며칠 안에 글이 몇 건이나 올라왔는지를 센다. 신상 팝업·카페는
 * 열리자마자 블로그 글이 몰리기 때문에 이게 실질적인 화제성 신호가 된다.
 *
 * 다만 이건 어디까지나 추정이다. 여기서 기간·가격·주소를 만들어내지 않는다 —
 * 확인은 사용자가 원문 링크에서 한다.
 */
export async function fetchNaverBlogBuzz(params: {
  query: string;
  freshDays?: number;
  limit?: number;
}): Promise<DiscoveryItem[]> {
  const credentials = naverSearchCredentials();
  const query = params.query.trim();
  if (!credentials || !query) return [];

  const search = new URLSearchParams({ query, display: "30", sort: "date" });
  const body = await fetchText(`https://naverapihub.apigw.ntruss.com/search/v1/blog?${search.toString()}`, {
    "X-NCP-APIGW-API-KEY-ID": credentials.id,
    "X-NCP-APIGW-API-KEY": credentials.secret,
  });
  if (!body) return [];

  const freshDays = params.freshDays ?? 21;
  const cutoff = Date.now() - freshDays * 86_400_000;
  const posts = parseItems(body)
    .map((record) => ({
      title: pick(record, "title"),
      link: pick(record, "link"),
      description: pick(record, "description"),
      postedAt: isoDate(pick(record, "postdate")),
    }))
    .filter((post): post is { title: string; link: string; description: string | undefined; postedAt: string } =>
      Boolean(post.title && post.link && post.postedAt));

  const recent = posts.filter((post) => new Date(post.postedAt).getTime() >= cutoff);
  // 최근 글이 두어 건뿐이면 화제라고 말할 근거가 없다. 그럴 땐 아무것도 내놓지 않는다.
  if (recent.length < 3) return [];

  const checkedAt = new Date().toISOString();
  return recent.slice(0, params.limit ?? 5).map((post) => ({
    id: `naver-blog-${post.link}`,
    title: stripTags(post.title),
    source: "naver_blog" as DiscoverySource,
    sourceLabel: "네이버 블로그 반응",
    // 글이 몰린다는 것 외에는 아무것도 확인된 게 없다.
    confidence: "inferred" as const,
    summary: post.description ? stripTags(post.description) : undefined,
    detailsUrl: post.link,
    // 왜 "화제"라고 판단했는지 근거를 그대로 보여준다. 숫자를 숨기면 믿을 이유가 없다.
    signals: [`최근 ${freshDays}일 블로그 글 ${recent.length}건`, `가장 최근 글 ${post.postedAt}`],
    checkedAt,
  }));
}

/**
 * 진단용 — 실제 응답의 필드 이름을 그대로 돌려준다.
 *
 * 기관 API의 정확한 필드명은 키를 발급받아 한 번 호출해 보기 전에는 확정할 수 없다.
 * 계속 추측하는 대신, 키가 들어온 직후 이걸로 실제 이름을 확인해 매핑을 정확히 맞춘다.
 * 응답 본문 전체가 아니라 키 이름만 돌려주므로 개인정보나 키 값이 새지 않는다.
 */
export async function probeSourceShape(source: DiscoverySource, query: string): Promise<{ ok: boolean; sampleKeys: string[]; itemCount: number }> {
  let body: string | null = null;
  if (source === "culture_data") {
    const serviceKey = cultureDataKey();
    if (!serviceKey) return { ok: false, sampleKeys: [], itemCount: 0 };
    const now = new Date();
    const until = new Date(now.getTime() + 30 * 86_400_000);
    body = await fetchText(`https://apis.data.go.kr/B553457/cultureinfo/period2?from=${yyyymmdd(now)}&to=${yyyymmdd(until)}&cPage=1&rows=5&sortStdr=1&serviceKey=${serviceKey}`);
  } else if (source === "naver_local" || source === "naver_blog") {
    const credentials = naverSearchCredentials();
    if (!credentials) return { ok: false, sampleKeys: [], itemCount: 0 };
    const path = source === "naver_local" ? "local" : "blog";
    body = await fetchText(`https://naverapihub.apigw.ntruss.com/search/v1/${path}?query=${encodeURIComponent(query)}&display=5`, {
      "X-NCP-APIGW-API-KEY-ID": credentials.id,
      "X-NCP-APIGW-API-KEY": credentials.secret,
    });
  }
  if (!body) return { ok: false, sampleKeys: [], itemCount: 0 };
  const items = parseItems(body);
  return { ok: true, sampleKeys: [...new Set(items.flatMap((item) => Object.keys(item)))], itemCount: items.length };
}
