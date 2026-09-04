import type { DiscoveryItem, ExperienceMood } from "./types";

/**
 * 여러 출처에서 온 "요즘 뜨는 것"을 하나의 목록으로 정리한다.
 *
 * 외부 호출은 하지 않는다 — 전부 순수 함수다. 실제 API 응답이 어떻게 생겼든 여기 규칙은
 * 그대로 검증할 수 있어야 해서 분리했다.
 *
 * 가장 중요한 규칙: 기관이 등록한 것(official)과 블로그 반응으로 추린 것(inferred)을
 * 섞어서 한 덩어리로 보여주지 않는다. 앞은 "11월 30일까지 한다"고 말해도 되지만,
 * 뒤는 "요즘 글이 많이 올라온다"까지만 말할 수 있다.
 */

/** 사용자가 쓰는 말 → 실제로 검색에 넣을 단어. 분위기 하나가 검색어 여러 개로 퍼진다. */
const MOOD_KEYWORDS: Record<ExperienceMood, string[]> = {
  romantic: ["로맨틱", "야경", "기념일"],
  mysterious: ["미디어아트", "몰입형", "빛"],
  trendy: ["팝업", "팝업스토어", "신상"],
  calm: ["조용한", "산책", "정원"],
  luxurious: ["프리미엄", "고급"],
  playful: ["체험", "이색", "액티비티"],
  warm: ["아늑한", "따뜻한"],
  nature: ["숲", "정원", "공원"],
  artistic: ["전시", "미술관", "공연"],
  hidden: ["숨은", "로컬", "소규모"],
};

/**
 * 자연어 요청에서 검색어를 만든다.
 *
 * "요즘 뜨는 거"라고만 해도 팝업·전시 쪽으로 열리도록 기본 키워드를 넣되, 사용자가 말한
 * 취향이 있으면 그게 우선이다. 지역은 항상 앞에 붙는다 — 전국 결과를 받아 걸러내는 것보다
 * 처음부터 그 동네를 물어보는 쪽이 훨씬 정확하다.
 */
export function discoveryQueries(params: {
  region?: string;
  preferences?: string[];
  moods?: ExperienceMood[];
  rawRequest?: string;
}): string[] {
  const region = params.region?.trim();
  const fromMoods = (params.moods ?? []).flatMap((mood) => MOOD_KEYWORDS[mood] ?? []);
  const fromPreferences = (params.preferences ?? []).map((value) => value.trim()).filter(Boolean);
  const spoken = [...fromPreferences, ...fromMoods];
  // 아무 취향도 안 말했을 때만 기본값을 쓴다. 말한 게 있으면 그걸 덮어쓰지 않는다.
  const terms = spoken.length ? spoken : ["팝업스토어", "전시", "축제"];
  const unique = [...new Set(terms)].slice(0, 4);
  return unique.map((term) => (region ? `${region} ${term}` : term));
}

/** 같은 것이 출처마다 다른 제목으로 올 수 있어, 비교 전에 군더더기를 지운다. */
function normalizeTitle(title: string): string {
  return title.replace(/[\s·,()[\]{}<>'"~!?.\-—]/g, "").toLowerCase();
}

/**
 * 서버 시계(UTC)가 아니라 한국 달력 기준의 날짜를 돌려준다.
 *
 * 기관이 주는 종료일은 "한국에서 그날까지"라는 뜻이고, 배포 서버는 UTC로 돈다.
 * 두 개를 그대로 빼면 자정 근처에서 하루가 어긋난다 — "3일 남았어"가 핵심인 기능에서
 * 하루 차이는 그냥 틀린 정보다. 한국은 서머타임이 없어 +9시간 고정으로 정확히 맞출 수 있다.
 */
function koreaCalendarDate(instant: Date): string {
  const shifted = new Date(instant.getTime() + 9 * 3_600_000);
  return shifted.toISOString().slice(0, 10);
}

/** 날짜(YYYY-MM-DD)끼리의 차이. 시각을 섞지 않으므로 시간대 때문에 흔들리지 않는다. */
function calendarDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.NaN;
  return Math.round((to - from) / 86_400_000);
}

/** 곧 끝나는 것일수록 먼저 알려야 의미가 있다. 한국 달력 기준으로 남은 날짜를 센다. */
export function daysRemaining(item: DiscoveryItem, today = new Date()): number | undefined {
  if (!item.endDate) return undefined;
  const remaining = calendarDaysBetween(koreaCalendarDate(today), item.endDate);
  return Number.isNaN(remaining) ? undefined : remaining;
}

/**
 * 이미 끝난 행사를 목록에 남기지 않는다.
 *
 * 종료일이 없는 항목은 버리지 않는다 — 기간이 원래 없는 상설 전시나, 블로그에서 온
 * 추정 항목이 여기 해당한다. 날짜를 모른다는 것과 끝났다는 것은 다르다.
 */
export function isStillRunning(item: DiscoveryItem, today = new Date()): boolean {
  const remaining = daysRemaining(item, today);
  return remaining == null || remaining >= 0;
}

/**
 * 같은 행사가 여러 출처에서 오면 하나로 합친다.
 *
 * 기관 데이터를 남기고 블로그 쪽을 버린다 — 같은 것이라면 기간·장소가 확인된 쪽이 낫고,
 * 블로그에서 온 근거(signals)는 합쳐서 "화제이기도 하다"는 정보로 남긴다.
 */
export function dedupeDiscoveries(items: DiscoveryItem[]): DiscoveryItem[] {
  const byTitle = new Map<string, DiscoveryItem>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, item);
      continue;
    }
    const [keep, drop] = existing.confidence === "official" ? [existing, item] : [item, existing];
    byTitle.set(key, { ...keep, signals: [...new Set([...keep.signals, ...drop.signals])] });
  }
  return [...byTitle.values()];
}

/**
 * 사용자가 말한 지역과 실제로 관련 있는 것만 남긴다.
 *
 * 기관 API는 지역 필터가 느슨해서 "인천"으로 물어도 전국 결과가 섞여 오는 일이 있다.
 * 지역 정보가 아예 없는 항목은 버리지 않는다 — 블로그에서 온 항목은 원래 주소가 없고,
 * 검색어에 이미 지역을 넣어 물어봤기 때문이다.
 */
export function matchesRegion(item: DiscoveryItem, region?: string): boolean {
  const wanted = region?.trim();
  if (!wanted) return true;
  // 제목은 위치가 아니다. 블로그 글 제목("여기 진짜 예쁘다")에 동네 이름이 들어갈 이유가 없어서,
  // 제목까지 대조하면 블로그에서 온 항목이 통째로 걸러진다.
  const location = [item.region, item.address, item.place].filter(Boolean).join(" ").trim();
  if (!location) return true;
  return location.includes(wanted);
}

/**
 * 정렬 순서를 정한다.
 *
 * 1) 기관에서 확인된 것이 먼저다. 추정은 확정 아래에 둔다.
 * 2) 그 안에서는 곧 끝나는 것이 먼저다 — 놓치면 다시 못 가는 것이 더 급하다.
 * 3) 기간이 없는 상설 항목은 급할 게 없어 뒤로 간다.
 */
export function rankDiscoveries(items: DiscoveryItem[], today = new Date()): DiscoveryItem[] {
  return [...items].sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === "official" ? -1 : 1;
    const left = daysRemaining(a, today);
    const right = daysRemaining(b, today);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left - right;
  });
}

export function selectDiscoveries(params: {
  items: DiscoveryItem[];
  region?: string;
  limit?: number;
  today?: Date;
}): DiscoveryItem[] {
  const today = params.today ?? new Date();
  const kept = params.items
    .filter((item) => isStillRunning(item, today))
    .filter((item) => matchesRegion(item, params.region));
  return rankDiscoveries(dedupeDiscoveries(kept), today).slice(0, params.limit ?? 12);
}

/**
 * 화면과 알림에 쓸 한 줄.
 *
 * 확정된 것만 날짜를 말한다. 추정은 "확인해봐"로 끝낸다 — 여기서 말투 하나 잘못 쓰면
 * 블로그에서 주워온 걸 우리가 확인한 사실처럼 만들어 버린다.
 */
export function discoveryHeadline(item: DiscoveryItem, today = new Date()): string {
  if (item.confidence === "inferred") {
    return `요즘 얘기가 많이 나와 (${item.signals[0] ?? "블로그 반응 기준"}). 실제 운영은 링크에서 확인해줘.`;
  }
  const remaining = daysRemaining(item, today);
  if (remaining != null && remaining <= 7) {
    return `${item.endDate}까지야. ${remaining <= 0 ? "오늘이 마지막" : `${remaining}일 남았어`}.`;
  }
  if (item.startDate && item.endDate) return `${item.startDate} ~ ${item.endDate}`;
  if (item.startDate) return `${item.startDate}부터`;
  return item.place ?? item.sourceLabel;
}

/**
 * 알림으로 보낼 만한 것인지 판단한다.
 *
 * 알림은 비용이 크다 — 안 급한 걸 자꾸 보내면 사람은 알림 자체를 꺼버린다. 그래서
 * 기관에서 확인됐고 기간이 실제로 얼마 안 남은 것만 보낸다. 추정 항목은 앱을 열었을 때
 * 보여주는 걸로 충분하고, 먼저 찔러서 알릴 근거가 못 된다.
 */
export function worthNotifying(item: DiscoveryItem, today = new Date()): boolean {
  if (item.confidence !== "official") return false;
  const remaining = daysRemaining(item, today);
  return remaining != null && remaining >= 0 && remaining <= 14;
}
