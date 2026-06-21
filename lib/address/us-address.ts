/** Customer service address from Google Places + optional unit line. */
export type UsAddressFieldValue = {
  /** Street + city + state + ZIP from Places (or manual compose). */
  formatted: string;
  unit: string;
  placeId?: string;
  /** User picked a Google suggestion (or passed manual validation). */
  verified: boolean;
};

export function emptyUsAddressValue(): UsAddressFieldValue {
  return { formatted: "", unit: "", verified: false };
}

export function usAddressFromStored(stored: string): UsAddressFieldValue {
  const trimmed = stored.trim();
  return {
    formatted: trimmed,
    unit: "",
    verified: Boolean(trimmed && looksLikeFullUsAddress(trimmed)),
  };
}

/** Minimum bar when Places is unavailable — full US line with ZIP. */
export function looksLikeFullUsAddress(line: string): boolean {
  const t = line.trim();
  if (t.length < 12) return false;
  if (!/\d/.test(t)) return false;
  if (!/,\s*[A-Za-z]{2,}/.test(t) && !/\b\d{5}(?:-\d{4})?\b/.test(t)) return false;
  return true;
}

export function isUsAddressReady(value: UsAddressFieldValue): boolean {
  const composed = composeUsAddress(value).trim();
  if (!composed) return false;
  if (value.verified) return true;
  return looksLikeFullUsAddress(composed);
}

/** Append apt / unit / gate code to a Google formatted line. */
export function composeUsAddress(value: UsAddressFieldValue): string {
  const base = value.formatted.trim();
  const unit = value.unit.trim();
  if (!base) return unit;
  if (!unit) return base;

  const normalizedUnit =
    /^(#|unit|apt|suite|ste|bldg|building|floor|fl)\b/i.test(unit) ? unit : `#${unit}`;

  const comma = base.indexOf(",");
  if (comma > 0) {
    const street = base.slice(0, comma).trim();
    const rest = base.slice(comma);
    return `${street} ${normalizedUnit}${rest}`;
  }
  return `${base} ${normalizedUnit}`;
}

export function composeManualUsAddress(parts: {
  street: string;
  city: string;
  state: string;
  zip: string;
  unit?: string;
}): UsAddressFieldValue {
  const street = parts.street.trim();
  const city = parts.city.trim();
  const state = parts.state.trim().toUpperCase().slice(0, 2);
  const zip = parts.zip.trim();
  const formatted = [street, `${city}, ${state} ${zip}`.trim()]
    .filter(Boolean)
    .join(", ");
  return {
    formatted,
    unit: parts.unit?.trim() ?? "",
    verified: looksLikeFullUsAddress(formatted),
  };
}
