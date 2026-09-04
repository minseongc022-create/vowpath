import "server-only";

import { geocodeRegion } from "./place-discovery";
import type { Coordinates } from "./place-utils";
import { discoverySourcesConfigured, fetchCultureEvents } from "./discovery-sources";
import { matchesRegion, overlapsPlanDate, planDateRange } from "./discovery-engine";
import type { DajeongPlan, DiscoveryItem } from "./types";

type CacheEntry = { expiresAt: number; items: DiscoveryItem[] };

const regionCache = new Map<string, CacheEntry>();
// 3시간 — 사용자·계획 수가 아무리 늘어도 같은 지역은 이 주기 동안 실제 외부 API를 한 번만 부른다.
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

function cacheKey(near?: Coordinates): string {
  return near ? `${near.latitude.toFixed(2)}:${near.longitude.toFixed(2)}` : "nationwide";
}

async function cachedCultureEvents(near?: Coordinates): Promise<DiscoveryItem[]> {
  const key = cacheKey(near);
  const cached = regionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.items;
  const items = await fetchCultureEvents({ near, radiusKm: 8, withinDays: 45, limit: 40 }).catch(() => [] as DiscoveryItem[]);
  regionCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, items });
  return items;
}

/**
 * 알림 스윕에서 계획의 discoveredEvents를 최신 상태로 채운다.
 *
 * 계획 생성 시점에 찾은 발견 결과(discoveredEvents)는 스냅샷이라 그 뒤에 새로 뜬 기관 행사를
 * 반영하지 못한다 — "요즘 뜨는 것"을 알림으로 보내려면 주기적으로 다시 찾아야 한다. 그렇다고
 * 계획마다 매 스윕(60초)마다 실제 API를 부르면 사용자가 늘수록 한도를 금방 넘긴다. 그래서
 * 지역 좌표 단위로 캐시해서, 같은 지역에 계획이 여러 개 있어도 캐시 주기(3시간)마다 실제
 * 호출은 한 번만 나간다. 블로그 추정(inferred) 항목은 애초에 알림 대상이 아니라서(worthNotifying이
 * official만 통과시킨다) 여기서 다시 부르지 않는다 — 그만큼 호출을 아낀다.
 */
export async function refreshDiscoveredEventsForPlan(plan: DajeongPlan): Promise<DajeongPlan> {
  if (!discoverySourcesConfigured() || plan.situation.singleCategory) return plan;
  const range = planDateRange(plan);
  if (!range) return plan;
  const near = await geocodeRegion(plan.situation.region);
  const nearby = await cachedCultureEvents(near);
  const matching = nearby.filter((item) => matchesRegion(item, plan.situation.region, near) && overlapsPlanDate(item, range));
  return { ...plan, discoveredEvents: matching };
}
