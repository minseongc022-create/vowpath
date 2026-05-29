import type { JobPriority } from "./types";

type CardForGuardrails = {
  priority: JobPriority;
  symptom: string;
  dispatchNotes: string;
  jobberPasteBlock: string;
};

const P1_KEYWORDS = [
  "no heat",
  "heater not working",
  "furnace not working",
  "no cool",
  "not cooling",
  "ac stopped",
  "ac not working",
  "leak",
  "water leak",
  "flood",
  "overflow",
  "gas smell",
  "smell gas",
  "carbon monoxide",
  "co alarm",
  "smoke",
  "sparking",
  "burning smell",
  "burning odor",
  "elderly",
  "infant",
  "baby",
  "newborn",
  "toddler",
  "medical",
  "oxygen",
  "asthma",
  "children at home",
  "kids at home",
  "young kids",
] as const;

const P2_KEYWORDS = [
  "same day",
  "today",
  "this afternoon",
  "this evening",
  "tonight",
  "asap",
  "soon",
  "weak airflow",
  "intermittent",
  "not urgent but",
] as const;

const P3_KEYWORDS = [
  "maintenance",
  "tune up",
  "tune-up",
  "filter change",
  "annual service",
  "routine",
  "quote only",
  "estimate only",
  "not urgent",
  "whenever",
  "next week",
] as const;

function buildCorpus(notes: string, parsed: CardForGuardrails): string {
  return [notes, parsed.symptom, parsed.dispatchNotes, parsed.jobberPasteBlock]
    .join("\n")
    .toLowerCase();
}

function hasKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function parseIndoorTempF(text: string): number | null {
  const patterns = [
    /(\d{2,3})\s*°?\s*f\b/i,
    /(\d{2,3})\s*degrees?\s*f/i,
    /indoor[^0-9]{0,30}(\d{2,3})/i,
    /inside[^0-9]{0,30}(\d{2,3})/i,
    /temp[^0-9]{0,12}(\d{2,3})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 40 && value <= 130) return value;
  }
  return null;
}

function isVulnerableHousehold(text: string): boolean {
  return /elderly|infant|baby|newborn|toddler|medical|oxygen|asthma|child|kid|young kids/.test(
    text,
  );
}

function isHardP1(corpus: string): boolean {
  if (hasKeyword(corpus, P1_KEYWORDS)) return true;
  if (/gas|smoke|sparking|burning smell|burning odor|carbon monoxide|co alarm/.test(corpus)) {
    return true;
  }

  const tempF = parseIndoorTempF(corpus);
  if (tempF !== null && tempF >= 86) return true;

  const comfortFailure =
    /no heat|no cool|not cooling|heater not working|furnace not working|ac stopped|ac not working|not working|stopped working/.test(
      corpus,
    );
  if (comfortFailure && isVulnerableHousehold(corpus)) return true;

  if (comfortFailure && /tonight|asap|same day|today|this evening/.test(corpus)) {
    return true;
  }

  return false;
}

function isExplicitP3(corpus: string): boolean {
  return hasKeyword(corpus, P3_KEYWORDS) && !isHardP1(corpus);
}

function isSoftP2(corpus: string): boolean {
  if (isHardP1(corpus) || isExplicitP3(corpus)) return false;

  if (hasKeyword(corpus, P2_KEYWORDS)) return true;

  const tempF = parseIndoorTempF(corpus);
  if (tempF !== null && tempF >= 80 && tempF < 86) return true;

  if (/not working|stopped|warm air|weak/.test(corpus)) return true;

  return false;
}

/**
 * Safety-first priority guardrails after AI classification.
 * Never downgrades urgent signals; ambiguous cases bias upward.
 */
export function applyPriorityGuardrails<T extends CardForGuardrails>(
  notes: string,
  parsed: T,
): T {
  const corpus = buildCorpus(notes, parsed);

  if (isHardP1(corpus)) {
    return { ...parsed, priority: "P1" };
  }

  if (isExplicitP3(corpus)) {
    return { ...parsed, priority: "P3" };
  }

  if (isSoftP2(corpus)) {
    const next: JobPriority =
      parsed.priority === "P3" ? "P2" : parsed.priority === "P1" ? "P1" : "P2";
    return { ...parsed, priority: next };
  }

  if (parsed.priority === "P3" && /comfort|temperature|too hot|too cold|not working/.test(corpus)) {
    return { ...parsed, priority: "P2" };
  }

  return parsed;
}
