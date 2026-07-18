/** Subtle tap feedback on phones that support the Vibration API. */
export function hapticTap(durationMs = 10) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(durationMs);
  } catch {
    return false;
  }
}

export function isCoarsePointerDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Call from click handlers when global touch listener may not fire (iOS). */
export function hapticOnClick() {
  hapticTap(12);
}
