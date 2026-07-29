import type { GeneratedAngle } from "./types";

export function countSuccessfulAngles(angles: GeneratedAngle[]): number {
  return angles.filter((a) => a.imageBase64 || a.imageUrl).length;
}
