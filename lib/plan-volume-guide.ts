import { SITE } from "./constants";

function parseDollars(value: string): number {
  return Number(value.replace(/[^0-9.]/g, ""));
}

/** Confirmed-dispatch break-even points from SITE list prices. */
export function planVolumeBreakpoints() {
  const liteBase = parseDollars(SITE.liteBasePrice);
  const litePer = parseDollars(SITE.litePerBooking);
  const flexBase = parseDollars(SITE.flexBasePrice);
  const flexPer = parseDollars(SITE.flexPerBooking);
  const unlimited = parseDollars(SITE.monthlyPrice);

  const liteFlexCross = (flexBase - liteBase) / (litePer - flexPer);
  const flexUnlimitedCross = (unlimited - flexBase) / flexPer;

  const flexStarts = Math.ceil(liteFlexCross);
  const unlimitedStarts = Math.ceil(flexUnlimitedCross);
  const liteMax = flexStarts - 1;

  return {
    liteMax,
    flexMin: flexStarts,
    flexMax: unlimitedStarts - 1,
    unlimitedMin: unlimitedStarts,
    liteFlexCross,
    flexUnlimitedCross,
  };
}

export function planVolumeGuideEn(plan: "lite" | "flex" | "unlimited"): string {
  const b = planVolumeBreakpoints();
  if (plan === "lite") {
    return `Best if you average ${b.liteMax <= 1 ? "0–1" : `0–${b.liteMax}`} confirmed dispatch${b.liteMax === 1 ? "" : "es"} per month (about ${Math.round(b.liteFlexCross * 10) / 10} or fewer).`;
  }
  if (plan === "flex") {
    return `Best if you average about ${b.flexMin}–${b.flexMax} confirmed dispatches per month (${Math.round(b.liteFlexCross * 10) / 10}–${Math.round(b.flexUnlimitedCross * 10) / 10} range).`;
  }
  return `Best if you average ${b.unlimitedMin} or more confirmed dispatches per month (break-even vs Flex at ~${Math.round(b.flexUnlimitedCross * 10) / 10}/mo).`;
}

export function planVolumeGuideEs(plan: "lite" | "flex" | "unlimited"): string {
  const b = planVolumeBreakpoints();
  if (plan === "lite") {
    return `Ideal si confirmas de media ${b.liteMax <= 1 ? "0–1" : `0–${b.liteMax}`} despacho${b.liteMax === 1 ? "" : "s"} al mes (~${Math.round(b.liteFlexCross * 10) / 10} o menos).`;
  }
  if (plan === "flex") {
    return `Ideal si confirmas unos ${b.flexMin}–${b.flexMax} despachos al mes (entre ~${Math.round(b.liteFlexCross * 10) / 10} y ~${Math.round(b.flexUnlimitedCross * 10) / 10}).`;
  }
  return `Ideal si confirmas ${b.unlimitedMin} o más despachos al mes (equilibrio vs Flex ~${Math.round(b.flexUnlimitedCross * 10) / 10}/mes).`;
}

export function planVolumeGuideKo(plan: "lite" | "flex" | "unlimited"): string {
  const b = planVolumeBreakpoints();
  if (plan === "lite") {
    return `월 평균 승인·디스패치 ${b.liteMax <= 1 ? "0–1건" : `0–${b.liteMax}건`}이면 이 플랜이 유리합니다 (약 ${Math.round(b.liteFlexCross * 10) / 10}건 이하).`;
  }
  if (plan === "flex") {
    return `월 평균 승인·디스패치 약 ${b.flexMin}–${b.flexMax}건이면 이 플랜이 유리합니다 (${Math.round(b.liteFlexCross * 10) / 10}–${Math.round(b.flexUnlimitedCross * 10) / 10}건 구간).`;
  }
  return `월 평균 승인·디스패치 ${b.unlimitedMin}건 이상이면 이 플랜이 유리합니다 (Flex 대비 손익분기 ~${Math.round(b.flexUnlimitedCross * 10) / 10}건/월).`;
}

export function pricingVolumeTipEn(): string {
  const b = planVolumeBreakpoints();
  return `Rule of thumb: under ~${Math.round(b.liteFlexCross * 10) / 10} dispatches/mo → Lite. ~${b.flexMin}–${b.flexMax} → Flex. ${b.unlimitedMin}+ → Unlimited (${SITE.monthlyPrice}/mo flat). Counts are confirmed dispatches you approve — not every ring.`;
}

export function pricingVolumeTipKo(): string {
  const b = planVolumeBreakpoints();
  return `기준: 월 ~${Math.round(b.liteFlexCross * 10) / 10}건 미만 → Lite · ${b.flexMin}–${b.flexMax}건 → Flex · ${b.unlimitedMin}건 이상 → Unlimited. 승인한 디스패치 기준이며, 모든 전화는 포함하지 않습니다.`;
}

export function pricingVolumeTipEs(): string {
  const b = planVolumeBreakpoints();
  return `Guía: menos de ~${Math.round(b.liteFlexCross * 10) / 10} despachos/mes → Lite. ~${b.flexMin}–${b.flexMax} → Flex. ${b.unlimitedMin}+ → Unlimited. Solo despachos confirmados que apruebas.`;
}
