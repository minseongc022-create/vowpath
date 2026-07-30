import type { GeneratedAngle } from "./types";

/**
 * Count exportable images. Fidelity warnings (needsFix) still count —
 * user can ask AI to repair them in the studio.
 */
export function countSuccessfulAngles(angles: GeneratedAngle[]): number {
  return angles.filter((a) => a.imageBase64 || a.imageUrl).length;
}

export function countNeedsFixAngles(angles: GeneratedAngle[]): number {
  return angles.filter((a) => a.needsFix && (a.imageBase64 || a.imageUrl)).length;
}
