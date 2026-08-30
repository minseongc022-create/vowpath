/**
 * 쉐어링크 게시물 캡션 — 채널별 톤, 근거 없는 말은 안 쓴다
 *
 * ★ `detail-page.ts`와 같은 원칙: 없는 근거는 지어내지 않는다
 *
 * "역대급 인생템", "써보니 최고예요" 같은 문구는 안 쓴다 — 실제로 써본 적
 * 없는 상품이다. 캡션에 넣는 사실은 전부 베스트랭킹 API가 준 값(가격·
 * 할인율·리뷰수·평점)뿐이고, 후킹은 문장 구조와 톤으로 만든다.
 *
 * ★ 광고 표시는 옵션이 아니다
 *
 * 공정거래위원회 "추천·보증 등에 관한 표시·광고 심사지침"에 따라 경제적
 * 대가(쉐어링크 수수료)를 받고 올리는 게시물은 이를 표시해야 한다. 자동
 * 게시라고 빠뜨리면 안 되므로 **캡션 조립 함수 자체가** 표시 문구를 항상
 * 붙이게 만든다 — 호출하는 쪽에서 깜빡할 수 있는 자리에 두지 않는다.
 */

import type { SharelinkCaption, SharelinkChannel, SharelinkItem } from "./types";

export const CAPTION_VERSION = "1.0";

/** 모든 게시물 끝에 예외 없이 붙는다 */
const AD_DISCLOSURE = "광고 | 이 링크를 통한 구매 시 일정 수수료를 받을 수 있습니다.";

function formatWon(krw: number): string {
  return `${krw.toLocaleString()}원`;
}

/** 근거가 있는 것만 골라 후킹 한 줄을 만든다. 전부 없으면 가격만 남는다 */
function buildHookLine(item: SharelinkItem): string {
  const parts: string[] = [];
  if (item.discountPct != null && item.discountPct > 0) parts.push(`${item.discountPct}% 할인`);
  if (item.reviewCount >= 1000) parts.push(`리뷰 ${item.reviewCount.toLocaleString()}개`);
  if (item.arrivesTomorrow) parts.push("내일 도착");
  return parts.length > 0 ? parts.join(" · ") : formatWon(item.priceKrw);
}

// ─────────────────────────────────────────────────────────────
// 스레드 — 반말·캐주얼
// ─────────────────────────────────────────────────────────────

function buildThreadsText(item: SharelinkItem): string {
  const hook = buildHookLine(item);
  const lines = [
    `이거 실화냐 ${formatWon(item.priceKrw)}`,
    hook !== formatWon(item.priceKrw) ? hook : null,
    item.ratingAvg != null ? `평점 ${item.ratingAvg} (${item.reviewCount.toLocaleString()}개)` : null,
    "",
    "링크 눌러서 바로 확인 👇",
    "",
    AD_DISCLOSURE,
  ].filter((l): l is string => l != null);
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// 인스타그램 — 살짝 더 정돈된 톤 + 해시태그
// ─────────────────────────────────────────────────────────────

function buildInstagramText(item: SharelinkItem): string {
  const hook = buildHookLine(item);
  const lines = [
    item.title,
    "",
    `${formatWon(item.priceKrw)}${hook !== formatWon(item.priceKrw) ? ` · ${hook}` : ""}`,
    item.ratingAvg != null ? `⭐ ${item.ratingAvg} (${item.reviewCount.toLocaleString()})` : null,
    "",
    "프로필 링크에서 바로 구매 가능해요",
    "",
    AD_DISCLOSURE,
  ].filter((l): l is string => l != null);
  return lines.join("\n");
}

function buildHashtags(item: SharelinkItem): string[] {
  const tags = ["토스쇼핑", "특가", "꿀템"];
  if (item.category) tags.push(item.category.replace(/\s+/g, ""));
  if (item.discountPct != null && item.discountPct >= 30) tags.push("초특가");
  return tags;
}

// ─────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────

export function buildCaption(item: SharelinkItem, channel: SharelinkChannel): SharelinkCaption {
  const hashtags = buildHashtags(item);
  const body = channel === "threads" ? buildThreadsText(item) : buildInstagramText(item);
  const hashtagLine = channel === "instagram" ? hashtags.map((t) => `#${t}`).join(" ") : "";

  return {
    channel,
    text: hashtagLine ? `${body}\n\n${hashtagLine}` : body,
    hashtags,
  };
}

export function buildCaptions(item: SharelinkItem, channels: SharelinkChannel[]): SharelinkCaption[] {
  return channels.map((c) => buildCaption(item, c));
}
