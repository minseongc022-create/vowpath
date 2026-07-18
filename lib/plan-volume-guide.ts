import { SITE } from "./constants";

function parseDollars(value: string): number {
  return Number(value.replace(/[^0-9.]/g, ""));
}

export function planVolumeBreakpoints() {
  const liteBase = parseDollars(SITE.liteBasePrice);
  const litePer = parseDollars(SITE.litePerBooking);
  const flexBase = parseDollars(SITE.flexBasePrice);
  const flexPer = parseDollars(SITE.flexPerBooking);
  const pro = parseDollars(SITE.proPrice);
  const scale = parseDollars(SITE.scalePrice);

  const liteFlexCross = (flexBase - liteBase) / (litePer - flexPer);
  const flexProCross = (pro - flexBase) / flexPer;
  const proScaleCross =
    (scale - pro) / (SITE.marginalDispatchCostUsd * SITE.scaleOverageMultiplier);

  const flexStarts = Math.ceil(liteFlexCross);
  const proStarts = Math.ceil(flexProCross);
  const scaleStarts = Math.ceil(proScaleCross) + SITE.proIncludedDispatches;

  return {
    liteFlexCross,
    flexProCross,
    proScaleCross,
    liteMax: flexStarts - 1,
    flexMin: flexStarts,
    flexMax: proStarts - 1,
    proMin: proStarts,
    proMax: scaleStarts - 1,
    scaleMin: scaleStarts,
  };
}

type GuidePlan = "lite" | "flex" | "pro" | "scale";

export function planVolumeGuideEn(plan: GuidePlan): string {
  const b = planVolumeBreakpoints();
  if (plan === "lite") {
    return `Best if you average ${b.liteMax <= 1 ? "0–1" : `0–${b.liteMax}`} confirmed dispatch${b.liteMax === 1 ? "" : "es"}/mo.`;
  }
  if (plan === "flex") {
    return `Best if you average about ${b.flexMin}–${b.flexMax} confirmed dispatches/mo.`;
  }
  if (plan === "pro") {
    return `Best if you average about ${b.proMin}–${b.proMax} dispatches/mo (${SITE.proIncludedDispatches} included before overage).`;
  }
  return `Best for storm season or ${b.scaleMin}+ dispatches/mo (${SITE.scaleIncludedDispatches} included, higher cap).`;
}

export function planVolumeGuideEs(plan: GuidePlan): string {
  const b = planVolumeBreakpoints();
  if (plan === "lite") {
    return `Ideal si confirmas ${b.liteMax <= 1 ? "0–1" : `0–${b.liteMax}`} despacho${b.liteMax === 1 ? "" : "s"}/mes.`;
  }
  if (plan === "flex") {
    return `Ideal para unos ${b.flexMin}–${b.flexMax} despachos confirmados/mes.`;
  }
  if (plan === "pro") {
    return `Ideal para ${b.proMin}–${b.proMax} despachos/mes (${SITE.proIncludedDispatches} incluidos).`;
  }
  return `Para temporada alta o ${b.scaleMin}+ despachos/mes (${SITE.scaleIncludedDispatches} incluidos).`;
}

export function planVolumeGuideKo(plan: GuidePlan): string {
  const b = planVolumeBreakpoints();
  if (plan === "lite") {
    return `월 평균 승인·디스패치 ${b.liteMax <= 1 ? "0–1건" : `0–${b.liteMax}건`}이면 유리합니다.`;
  }
  if (plan === "flex") {
    return `월 평균 ${b.flexMin}–${b.flexMax}건이면 유리합니다.`;
  }
  if (plan === "pro") {
    return `월 평균 ${b.proMin}–${b.proMax}건이면 유리 (${SITE.proIncludedDispatches}건 포함).`;
  }
  return `스톰 시즌·월 ${b.scaleMin}건+ (${SITE.scaleIncludedDispatches}건 포함).`;
}

export function pricingVolumeTipEn(): string {
  const b = planVolumeBreakpoints();
  return `Lite → quiet months. Flex → ${b.flexMin}–${b.flexMax}/mo. Pro → ${b.proMin}–${b.proMax}/mo (${SITE.proIncludedDispatches} included). Scale → ${b.scaleMin}+/mo. Dashboard alerts at 80% & 100% — no surprise overage bills.`;
}

export function pricingVolumeTipKo(): string {
  const b = planVolumeBreakpoints();
  return `Lite(적음) · Flex ${b.flexMin}–${b.flexMax}건 · Pro ${b.proMin}–${b.proMax}건 · Scale ${b.scaleMin}건+. 80%/100% 사용량 알림 — 예고 없는 청구 없음.`;
}

export function pricingVolumeTipEs(): string {
  const b = planVolumeBreakpoints();
  return `Lite (meses tranquilos) · Flex ${b.flexMin}–${b.flexMax} · Pro ${b.proMin}–${b.proMax} · Scale ${b.scaleMin}+. Alertas al 80% y 100% — sin cargos sorpresa.`;
}

export const PRICING_TRANSPARENCY_FOOTNOTE_EN =
  "Unlike most services in this space, we don't do sudden surprise bills. Included dispatch counts reset each billing month. Spam, wrong numbers, and jobs you cancel never count. Dashboard alerts before any overage posts.";

export const PRICING_GUARANTEES_EN = [
  "30-day money-back guarantee",
  "Cancel anytime — no contracts",
  "Usage alerts before overage charges",
  "No surprise bills",
  "Predictable billing — not sudden charges",
] as const;
