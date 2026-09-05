import type { DajeongPlan, ReservationTask } from "./types";

/**
 * 온라인으로만 예약받는 곳을 "탭 한 번"에 가깝게 만드는 링크 조립기.
 *
 * 왜 로봇이 대신 입력하지 않는가: 네이버예약·캐치테이블 같은 곳은 이용약관에서 자동화 접근을
 * 금지한다. 잘 숨기면 당장은 안 걸릴 수 있지만, 걸리면 사용자 계정이 정지되고 서비스가 통째로
 * 타격을 받는다. 그래서 대신, 각 플랫폼이 **공개적으로 지원하는 URL 파라미터**로 날짜·인원을
 * 미리 채워서 보낸다. 사용자는 확인 버튼만 누르면 된다.
 *
 * 지원하지 않는 파라미터를 임의로 붙이면 링크가 깨지거나 엉뚱한 화면이 열린다 — 그러면 도움이
 * 아니라 방해다. 그래서 확실한 것만 붙이고, 모르면 원래 링크를 그대로 돌려준다.
 */

export type PrefilledLink = {
  url: string;
  /** 실제로 미리 채워진 항목. 비어 있으면 그냥 원래 링크라는 뜻이다. */
  filled: string[];
  platform: string;
};

function platformOf(url: string): string {
  if (/booking\.naver/i.test(url)) return "네이버예약";
  if (/catchtable/i.test(url)) return "캐치테이블";
  if (/yanolja/i.test(url)) return "야놀자";
  if (/yeogi|goodchoice/i.test(url)) return "여기어때";
  if (/booking\.com/i.test(url)) return "부킹닷컴";
  if (/interpark|ticketlink|yes24/i.test(url)) return "티켓 예매처";
  if (/tabling/i.test(url)) return "테이블링";
  return "예약 페이지";
}

/**
 * 항목의 예약 링크에 날짜·인원을 붙인다. 붙일 수 있는 플랫폼만 붙이고, 나머지는 원본 그대로.
 *
 * 여기서 "붙일 수 있다"는 건 그 플랫폼이 공개 문서나 자기네 공유 링크에서 실제로 쓰는
 * 파라미터라는 뜻이다. 추측해서 넣지 않는다.
 */
export function prefilledBookingLink(task: ReservationTask, plan: DajeongPlan): PrefilledLink {
  const raw = task.bookingUrl?.trim();
  const platform = raw ? platformOf(raw) : "예약 페이지";
  if (!raw || !/^https?:\/\//i.test(raw)) return { url: raw ?? "", filled: [], platform };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: raw, filled: [], platform };
  }

  const date = plan.situation.targetDate;
  const party = String(Math.max(1, plan.situation.partySize));
  const filled: string[] = [];

  if (/booking\.naver/i.test(url.hostname)) {
    // 네이버예약이 자기 공유 링크에서 쓰는 파라미터.
    url.searchParams.set("startDate", date);
    url.searchParams.set("bookingCount", party);
    filled.push("날짜", "인원");
  } else if (/yanolja|yeogi|goodchoice/i.test(url.hostname)) {
    const checkout = shiftDate(date, Math.max(1, (plan.situation.tripDays ?? 1) - 1));
    url.searchParams.set("checkIn", date);
    url.searchParams.set("checkOut", checkout);
    url.searchParams.set("personal", party);
    filled.push("체크인·체크아웃", "인원");
  } else if (/booking\.com/i.test(url.hostname)) {
    const [inYear, inMonth, inDay] = date.split("-");
    const checkout = shiftDate(date, Math.max(1, (plan.situation.tripDays ?? 1) - 1)).split("-");
    url.searchParams.set("checkin_year", inYear);
    url.searchParams.set("checkin_month", String(Number(inMonth)));
    url.searchParams.set("checkin_monthday", String(Number(inDay)));
    url.searchParams.set("checkout_year", checkout[0]);
    url.searchParams.set("checkout_month", String(Number(checkout[1])));
    url.searchParams.set("checkout_monthday", String(Number(checkout[2])));
    url.searchParams.set("group_adults", party);
    filled.push("체크인·체크아웃", "인원");
  }

  return { url: url.toString(), filled, platform };
}

export function shiftDate(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
}

/** 화면에 띄울 안내 문구. 미리 채운 게 없으면 괜히 채웠다고 말하지 않는다. */
export function prefilledLinkNote(link: PrefilledLink): string {
  if (!link.filled.length) return `${link.platform}에서 직접 확인하고 예약해야 해.`;
  return `${link.platform} 예약 화면에 ${link.filled.join("·")}까지 미리 채워서 열어줄게. 확인만 하면 돼.`;
}
