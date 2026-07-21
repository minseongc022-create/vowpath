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
  /** Pro overage uses premium COGS × Pro multiplier when comparing to Scale flat. */
  const proOverageRate = SITE.premiumMarginalDispatchCostUsd * SITE.proOverageMultiplier;
  const proScaleCross = (scale - pro) / proOverageRate;

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

type GuidePlan = "lite" | "flex" | "pro" | "scale" | "voice_starter" | "voice_pro";

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
  if (plan === "scale") {
    return `Best for storm season or ${b.scaleMin}+ dispatches/mo (${SITE.scaleIncludedDispatches} included, higher cap).`;
  }
  if (plan === "voice_starter") {
    return `Best if you expect under ~${SITE.voiceStarterIncludedMinutes} talk-minutes/mo (short after-hours volume).`;
  }
  return `Best if you expect ~${Math.round(SITE.voiceProIncludedMinutes * 0.4)}–${SITE.voiceProIncludedMinutes} talk-minutes/mo (busy nights / multi-line).`;
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
  if (plan === "scale") {
    return `Para temporada alta o ${b.scaleMin}+ despachos/mes (${SITE.scaleIncludedDispatches} incluidos).`;
  }
  if (plan === "voice_starter") {
    return `Ideal si esperas menos de ~${SITE.voiceStarterIncludedMinutes} min de llamada/mes.`;
  }
  return `Ideal para ~${Math.round(SITE.voiceProIncludedMinutes * 0.4)}–${SITE.voiceProIncludedMinutes} min de llamada/mes.`;
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
  if (plan === "scale") {
    return `스톰 시즌·월 ${b.scaleMin}건+ (${SITE.scaleIncludedDispatches}건 포함).`;
  }
  if (plan === "voice_starter") {
    return `월 통화 ~${SITE.voiceStarterIncludedMinutes}분 이하면 유리합니다.`;
  }
  return `월 통화 ~${Math.round(SITE.voiceProIncludedMinutes * 0.4)}–${SITE.voiceProIncludedMinutes}분이면 유리합니다.`;
}

export function pricingVolumeTipEn(): string {
  const b = planVolumeBreakpoints();
  return `Dispatch track: Lite (quiet) → Flex ${b.flexMin}–${b.flexMax}/mo → Pro ${b.proMin}–${b.proMax}/mo → Scale ${b.scaleMin}+. Or pick Voice Starter / Voice Pro if you prefer included talk-minutes. Same intake + 1/2 holds either way. Alerts at 80% & 100%.`;
}

export function pricingVolumeTipKo(): string {
  const b = planVolumeBreakpoints();
  return `출동 과금: Lite(적음) · Flex ${b.flexMin}–${b.flexMax}건 · Pro ${b.proMin}–${b.proMax}건 · Scale ${b.scaleMin}건+. 또는 분당 플랜 Voice Starter / Voice Pro. 접수·1/2 hold 동일. 80%/100% 알림.`;
}

export function pricingVolumeTipEs(): string {
  const b = planVolumeBreakpoints();
  return `Despacho: Lite → Flex ${b.flexMin}–${b.flexMax} → Pro ${b.proMin}–${b.proMax} → Scale ${b.scaleMin}+. O Voice Starter / Voice Pro por minutos. Misma IA + holds 1/2. Alertas 80%/100%.`;
}

export const PRICING_TRANSPARENCY_FOOTNOTE_EN =
  "Choose dispatch billing (approved/scheduled emergency jobs only) or per-minute Voice plans (talk time, rounded up per call). Free estimate calls (press 2) never count on either track. Spam, wrong numbers, and jobs you cancel never count on dispatch plans. We alert at 80% and 100% of included dispatches or minutes before overage — no surprise live-agent transfer fees.";

export const PRICING_GUARANTEES_EN = [
  "30-day money-back guarantee",
  "Cancel anytime — no contracts",
  "Free estimates on every plan",
  "Usage alerts before overage charges",
] as const;

export const PRICING_TRANSPARENCY_FOOTNOTE_ES =
  "Elige facturación por despacho (solo emergencias aprobadas/programadas) o planes Voice por minuto (tiempo de llamada, redondeado por llamada). Los presupuestos gratis (opción 2) no cuentan en ninguna vía. Alertas al 80% y 100% antes del exceso.";

export const PRICING_GUARANTEES_ES = [
  "Garantía de devolución de 30 días",
  "Cancela cuando quieras — sin contratos",
  "Presupuestos gratis en todos los planes",
  "Alertas de uso antes del exceso",
] as const;

export const PRICING_TRANSPARENCY_FOOTNOTE_KO =
  "출동 승인 과금 또는 분당 Voice 플랜 중 선택. 무료 견적(메뉴 2)은 어느 트랙에서도 과금되지 않습니다. 포함량 80%/100% 알림 — 서프라이즈 라이브 에이전트 수수료 없음.";

export const PRICING_GUARANTEES_KO = [
  "30일 환불 보장",
  "언제든 해지 — 약정 없음",
  "모든 플랜 무료 견적",
  "초과 요금 전 사용량 알림",
] as const;
