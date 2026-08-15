/** Light tap feedback — no-op if unsupported (desktop/iOS Safari quirks). */
export function haptic(ms: number | number[] = 12): void {
  if (typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}

export function hapticSelect(): void {
  haptic(10);
}

export function hapticConfirm(): void {
  haptic([8, 30, 12]);
}
