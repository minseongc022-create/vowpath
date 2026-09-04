import "server-only";

import { appendAssistantNote } from "./plan-engine";
import { discoveryHeadline, matchesRegion, overlapsPlanDate, planDateRange } from "./discovery-engine";
import { discoverySourcesConfigured, fetchCultureEvents, fetchNaverBlogBuzz } from "./discovery-sources";
import { geocodeRegion } from "./place-discovery";
import type { DajeongPlan, DiscoveryItem } from "./types";

/**
 * 계획을 짤 때 그 날짜·지역에 실제로 열리는 기간 한정 행사를 같이 찾아 알려준다.
 *
 * "경복궁 야간개장 하는 줄도 모르고 계획 짰다" 같은 일이 없게 하려는 기능이다. 다만 이걸
 * 자동으로 일정에 끼워 넣지는 않는다 — 사용자가 요청하지 않은 항목을 몰래 코스에 넣으면
 * 예산·동선이 깨지고, "생일이라고 꽃을 멋대로 끼워 넣지 않는다"는 기존 원칙과도 어긋난다.
 * 대신 대화 메모로 제안하고, 넣을지는 사용자가 정한다.
 */

const MS_PER_DAY = 86_400_000;

function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function eventLine(item: DiscoveryItem): string {
  const when = item.startDate && item.endDate ? `(${formatMonthDay(item.startDate)}~${formatMonthDay(item.endDate)})` : "";
  return `‘${item.title}’${when}${item.place ? ` · ${item.place}` : ""}`;
}

/**
 * 계획에 그 날짜·지역 행사 정보를 대화 메모로 붙인다.
 *
 * 확정(official, 기관 데이터)만 "그날 하고 있어"라고 말한다. 추정(inferred, 블로그 반응)은
 * 날짜를 확인 못 했으니 계획 날짜와 겹치는지 판단할 수 없다 — 그래서 날짜 매칭에서는 아예
 * 빼고, 지역만 맞으면 "요즘 그 동네에서 화제인 것도 있어" 정도로만 가볍게 덧붙인다.
 */
export async function attachDiscoveryNote(plan: DajeongPlan): Promise<DajeongPlan> {
  if (!discoverySourcesConfigured() || plan.situation.singleCategory) return plan;
  const range = planDateRange(plan);
  if (!range) return plan;

  const near = await geocodeRegion(plan.situation.region);
  const withinDays = Math.max(1, Math.ceil((range.end.getTime() - Date.now()) / MS_PER_DAY) + 3);

  const [culture, buzz] = await Promise.all([
    fetchCultureEvents({ near, radiusKm: 8, withinDays: Math.min(90, withinDays), limit: 30 }),
    fetchNaverBlogBuzz({ query: `${plan.situation.region} 팝업` }).catch(() => [] as DiscoveryItem[]),
  ]);

  const matchingEvents = culture
    .filter((item) => matchesRegion(item, plan.situation.region, near))
    .filter((item) => overlapsPlanDate(item, range))
    .slice(0, 2);
  const matchingBuzz = buzz.filter((item) => matchesRegion(item, plan.situation.region, near)).slice(0, 1);

  if (!matchingEvents.length && !matchingBuzz.length) return plan;

  const parts: string[] = [];
  if (matchingEvents.length) {
    parts.push(`이 날짜에 ${plan.situation.region} 근처에서 ${matchingEvents.map(eventLine).join(", ")} 하고 있어. 코스에 넣어볼까?`);
  }
  if (matchingBuzz.length) {
    // 추정 항목은 날짜를 단정하지 않는다 — headline이 이미 "확인해줘"로 끝나게 만들어져 있다.
    parts.push(`${discoveryHeadline(matchingBuzz[0])} (‘${matchingBuzz[0].title}’)`);
  }
  return appendAssistantNote({ ...plan, discoveredEvents: [...matchingEvents, ...matchingBuzz] }, parts.join(" "));
}
