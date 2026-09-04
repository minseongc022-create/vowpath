/** Platform-wide defaults — admin can override via store.platformSettings. */
export type GiuPlatformSettings = {
  /** 미수령 유예시간 (분). 기본 2시간. */
  notPickedUpGraceMinutes: number;
  /** 픽업일 변경 최대 허용 시간 (기존 픽업 종료로부터). 기본 24시간. */
  maxPickupChangeHours: number;
  /** 주문당 픽업일 변경 최대 횟수. */
  maxPickupChangesPerOrder: number;
  /** 지우쿠 수수료율 (0–1). */
  commissionRate: number;
};

export const DEFAULT_PLATFORM_SETTINGS: GiuPlatformSettings = {
  notPickedUpGraceMinutes: 120,
  maxPickupChangeHours: 24,
  maxPickupChangesPerOrder: 1,
  commissionRate: 0.12,
};

export function resolvePlatformSettings(
  raw?: Partial<GiuPlatformSettings> | null,
): GiuPlatformSettings {
  const p = raw ?? {};
  return {
    notPickedUpGraceMinutes: clampInt(
      p.notPickedUpGraceMinutes,
      30,
      480,
      DEFAULT_PLATFORM_SETTINGS.notPickedUpGraceMinutes,
    ),
    maxPickupChangeHours: clampInt(
      p.maxPickupChangeHours,
      6,
      72,
      DEFAULT_PLATFORM_SETTINGS.maxPickupChangeHours,
    ),
    maxPickupChangesPerOrder: clampInt(
      p.maxPickupChangesPerOrder,
      1,
      2,
      DEFAULT_PLATFORM_SETTINGS.maxPickupChangesPerOrder,
    ),
    commissionRate: clampRate(p.commissionRate, DEFAULT_PLATFORM_SETTINGS.commissionRate),
  };
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampRate(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(0.5, Math.max(0, value));
}
