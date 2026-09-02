import type { PaceUpdate } from "./types";

const PROFILE_MARKERS = /원래|항상|늘\s|평소|보통\s*나는|난\s*늘|나는\s*늘|데이트할\s*때\s*(늘|항상|보통)/;
const SESSION_MARKERS = /오늘(만|은|따라)?|이번엔|이번에는|지금은|오늘\s*따라|컨디션이\s*안\s*좋아서/;

/**
 * A single situational remark ("오늘 피곤해서 여유롭게") should only ever touch this plan.
 * Only clearly durable language ("난 원래 여기저기 많이 다니는 게 좋아") is worth remembering
 * across future plans — everything in between defaults to session-only so we never overwrite
 * someone's real taste with a one-off mood.
 */
export function classifyPaceFeedback(instruction: string): PaceUpdate | null {
  const relaxed = /여유|널널|천천히|쉬엄|여유롭게|느긋/.test(instruction);
  const compact = /알차게|빡빡|여기저기\s*많이|장소.{0,4}많이|꽉\s*차게/.test(instruction);
  const placesMatch = instruction.match(/하루에\s*(\d)\s*군데|(\d)\s*곳\s*정도/);
  const complaintAboutMovement = /이동\s*너무\s*많|이동이\s*(많|힘들)|너무\s*걸/.test(instruction);
  if (!relaxed && !compact && !placesMatch && !complaintAboutMovement) return null;

  const density = relaxed ? "relaxed" as const : compact ? "compact" as const : complaintAboutMovement ? "relaxed" as const : undefined;
  const placesPerDay = placesMatch ? Number(placesMatch[1] ?? placesMatch[2]) : undefined;
  const scope = PROFILE_MARKERS.test(instruction) ? "profile" as const : "session" as const;
  if (SESSION_MARKERS.test(instruction)) return { scope: "session", density, placesPerDay, note: instruction.slice(0, 140) };
  return { scope, density, placesPerDay, note: instruction.slice(0, 140) };
}
