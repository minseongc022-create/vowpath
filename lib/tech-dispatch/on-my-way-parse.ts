export const ON_MY_WAY_ETA_OPTIONS = [5, 10, 15, 30, 45, 60] as const;
export type OnMyWayEtaMinutes = (typeof ON_MY_WAY_ETA_OPTIONS)[number];

function normalizeOtwBody(body: string): string {
  let trimmed = body.trim();
  trimmed = trimmed.replace(/^0(?=tw|mw\b)/i, "O");
  return trimmed;
}

export function parseDepartingPhrase(body: string): boolean {
  const t = normalizeOtwBody(body).toLowerCase().replace(/\s+/g, " ").replace(/[.!]+$/, "").trim();
  if (!t) return false;

  const exact = new Set([
    "departing",
    "depart",
    "leaving",
    "leave",
    "heading out",
    "headed out",
    "head out",
    "on my way",
    "on the way",
    "otw",
    "omw",
    "en route",
    "enroute",
  ]);
  if (exact.has(t)) return true;

  return /^(?:departing|depart|leaving|leave|otw|omw|en\s*route)$/.test(t);
}

export function parseOnMyWayMinutes(body: string): OnMyWayEtaMinutes | null {
  const trimmed = normalizeOtwBody(body);

  const patterns = [
    /^OTW\s*(\d{1,2})$/i,
    /^OMW\s*(\d{1,2})$/i,
    /^(?:on\s*my\s*way|heading\s*out)\s*(\d{1,2})$/i,
    /^(\d{1,2})\s*min(?:ute)?s?\s*(?:eta|away)?$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const n = Number(match[1]);
      if (ON_MY_WAY_ETA_OPTIONS.includes(n as OnMyWayEtaMinutes)) {
        return n as OnMyWayEtaMinutes;
      }
    }
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    const n = Number(trimmed);
    return ON_MY_WAY_ETA_OPTIONS.includes(n as OnMyWayEtaMinutes)
      ? (n as OnMyWayEtaMinutes)
      : null;
  }

  return null;
}

export function looksLikeOnMyWayAttempt(body: string): boolean {
  const t = normalizeOtwBody(body);
  if (parseOnMyWayMinutes(t) !== null) return true;
  if (parseDepartingPhrase(t)) return true;
  return /^(?:otw|omw|on\s*my\s*way|heading\s*out|departing|leaving)\b/i.test(t);
}
