import { ALL_PLAN_IDS, type PlanId } from "@/lib/constants";

const PLACEHOLDER_MARKERS = ["xxxx", "change-me", "your_", "123456"];

export function isValidLsEnvValue(value?: string): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (PLACEHOLDER_MARKERS.some((m) => v.toLowerCase().includes(m))) return false;
  return true;
}

export function variantIdForPlan(plan: PlanId): string | undefined {
  if (plan === "flex") return process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX;
  if (plan === "lite") return process.env.LEMON_SQUEEZY_VARIANT_ID_LITE;
  if (plan === "scale") return process.env.LEMON_SQUEEZY_VARIANT_ID_SCALE;
  if (plan === "voice_starter") return process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER;
  if (plan === "voice_pro") return process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO;
  return process.env.LEMON_SQUEEZY_VARIANT_ID_PRO;
}

export function usageVariantIdForPlan(plan: "flex" | "lite"): string | undefined {
  return plan === "flex"
    ? process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX_USAGE
    : process.env.LEMON_SQUEEZY_VARIANT_ID_LITE_USAGE;
}

export function voiceOverageVariantIdForPlan(
  plan: "voice_starter" | "voice_pro",
  user?: { discountCohort?: string; betaCohortSteppedAt?: string },
): string | undefined {
  const founder = user?.discountCohort === "beta_feedback" && !user?.betaCohortSteppedAt;
  if (plan === "voice_starter") {
    if (founder && process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_STARTER_OVERAGE) {
      return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_STARTER_OVERAGE;
    }
    return process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER_OVERAGE;
  }
  if (founder && process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_PRO_OVERAGE) {
    return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_PRO_OVERAGE;
  }
  return process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO_OVERAGE;
}

export function cappedOverageVariantIdForPlan(
  plan: "pro" | "scale",
  user?: { discountCohort?: string; betaCohortSteppedAt?: string },
): string | undefined {
  if (plan === "pro") {
    return process.env.LEMON_SQUEEZY_VARIANT_ID_PRO_OVERAGE;
  }
  const founder = user?.discountCohort === "beta_feedback" && !user?.betaCohortSteppedAt;
  if (founder && process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_SCALE_OVERAGE) {
    return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_SCALE_OVERAGE;
  }
  return process.env.LEMON_SQUEEZY_VARIANT_ID_SCALE_OVERAGE;
}

export function betaCohortIntroVariantId(): string | undefined {
  return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_INTRO;
}

export function betaCohortScaleIntroVariantId(): string | undefined {
  return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_SCALE;
}

export function betaCohortLockedVariantId(): string | undefined {
  return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_LOCKED ?? process.env.LEMON_SQUEEZY_VARIANT_ID_PRO;
}

export function betaCohortScaleLockedVariantId(): string | undefined {
  return process.env.LEMON_SQUEEZY_VARIANT_ID_SCALE;
}

export function betaCohortFlexIntroVariantId(): string | undefined {
  return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_FLEX ?? process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX;
}

export function betaCohortFlexUsageVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_FLEX_USAGE ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX_USAGE
  );
}

export function betaCohortFlexLockedVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_FLEX_LOCKED ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX
  );
}

export function betaCohortFlexLockedUsageVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_FLEX_USAGE_LOCKED ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_FLEX_USAGE
  );
}

export function betaCohortLiteIntroVariantId(): string | undefined {
  return process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_LITE ?? process.env.LEMON_SQUEEZY_VARIANT_ID_LITE;
}

export function betaCohortLiteUsageVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_LITE_USAGE ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_LITE_USAGE
  );
}

export function betaCohortLiteLockedVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_LITE_LOCKED ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_LITE
  );
}

export function betaCohortLiteLockedUsageVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_LITE_USAGE_LOCKED ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_LITE_USAGE
  );
}

export function betaCohortVoiceStarterIntroVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_STARTER ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER
  );
}

export function betaCohortVoiceProIntroVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_PRO ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO
  );
}

export function betaCohortVoiceStarterLockedVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_STARTER_LOCKED ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_STARTER
  );
}

export function betaCohortVoiceProLockedVariantId(): string | undefined {
  return (
    process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_VOICE_PRO_LOCKED ??
    process.env.LEMON_SQUEEZY_VARIANT_ID_VOICE_PRO
  );
}

export function betaCohortIntroVariantIdForPlan(plan: PlanId): string | undefined {
  if (plan === "flex") return betaCohortFlexIntroVariantId();
  if (plan === "lite") return betaCohortLiteIntroVariantId();
  if (plan === "scale") return betaCohortScaleIntroVariantId();
  if (plan === "voice_starter") return betaCohortVoiceStarterIntroVariantId();
  if (plan === "voice_pro") return betaCohortVoiceProIntroVariantId();
  return betaCohortIntroVariantId();
}

export function betaCohortLockedVariantIdForPlan(plan: PlanId): string | undefined {
  if (plan === "flex") return betaCohortFlexLockedVariantId();
  if (plan === "lite") return betaCohortLiteLockedVariantId();
  if (plan === "scale") return betaCohortScaleLockedVariantId();
  if (plan === "voice_starter") return betaCohortVoiceStarterLockedVariantId();
  if (plan === "voice_pro") return betaCohortVoiceProLockedVariantId();
  return betaCohortLockedVariantId();
}

export function isLsConfigured(plan: PlanId = "pro"): boolean {
  const key = process.env.LEMON_SQUEEZY_API_KEY;
  const variantId = variantIdForPlan(plan);
  return isValidLsEnvValue(key) && isValidLsEnvValue(variantId);
}

/** True when API key + store + at least one sellable plan variant are configured. */
export function isAnyLsPlanConfigured(): boolean {
  if (!isValidLsEnvValue(process.env.LEMON_SQUEEZY_API_KEY)) return false;
  if (!isValidLsEnvValue(process.env.LEMON_SQUEEZY_STORE_ID)) return false;
  return ALL_PLAN_IDS.some((plan) => isValidLsEnvValue(variantIdForPlan(plan)));
}

export function allowCheckoutFallback(): boolean {
  return (
    process.env.ALLOW_DEMO_CHECKOUT === "true" ||
    process.env.NODE_ENV === "development"
  );
}

/** Map a Lemon Squeezy variant id back to an Effiroad plan (webhook helper). */
export function planFromVariantId(variantId: string | number | undefined): PlanId | undefined {
  if (variantId == null) return undefined;
  const id = String(variantId);
  for (const plan of ALL_PLAN_IDS) {
    if (variantIdForPlan(plan) === id) return plan;
    if (plan === "flex" && betaCohortFlexIntroVariantId() === id) return plan;
    if (plan === "lite" && betaCohortLiteIntroVariantId() === id) return plan;
    if (plan === "pro" && betaCohortIntroVariantId() === id) return plan;
    if (plan === "scale" && betaCohortScaleIntroVariantId() === id) return plan;
    if (plan === "voice_starter" && betaCohortVoiceStarterIntroVariantId() === id) return plan;
    if (plan === "voice_pro" && betaCohortVoiceProIntroVariantId() === id) return plan;
  }
  return undefined;
}

export function usageVariantIdsForPlan(plan: PlanId): string[] {
  const ids: string[] = [];
  if (plan === "flex" || plan === "lite") {
    for (const v of [
      usageVariantIdForPlan(plan),
      plan === "flex" ? betaCohortFlexUsageVariantId() : betaCohortLiteUsageVariantId(),
      plan === "flex"
        ? betaCohortFlexLockedUsageVariantId()
        : betaCohortLiteLockedUsageVariantId(),
    ]) {
      if (v && isValidLsEnvValue(v)) ids.push(v);
    }
  }
  if (plan === "pro" || plan === "scale") {
    for (const v of [
      cappedOverageVariantIdForPlan(plan),
      plan === "scale" ? process.env.LEMON_SQUEEZY_VARIANT_ID_BETA_SCALE_OVERAGE : undefined,
    ]) {
      if (v && isValidLsEnvValue(v)) ids.push(v);
    }
  }
  if (plan === "voice_starter" || plan === "voice_pro") {
    for (const v of [
      voiceOverageVariantIdForPlan(plan),
      voiceOverageVariantIdForPlan(plan, { discountCohort: "beta_feedback" }),
    ]) {
      if (v && isValidLsEnvValue(v)) ids.push(v);
    }
  }
  return [...new Set(ids)];
}
