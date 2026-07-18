/** Subtle tap feedback on phones that support the Vibration API. */
export function hapticTap(durationMs = 6) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(durationMs);
  } catch {
    // Some browsers block vibration outside user gestures.
  }
}

export function isCoarsePointerDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
