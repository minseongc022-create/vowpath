import type { GeneratedAngle } from "./types";

/** Only images that passed fidelity QA (have pixels and no error) count as success. */
export function countSuccessfulAngles(angles: GeneratedAngle[]): number {
  return angles.filter((a) => (a.imageBase64 || a.imageUrl) && !a.error).length;
}
