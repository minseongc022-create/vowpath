/** Short booking reference for owner SMS (e.g. A3F2). */
export function bookingShortRef(bookingId: string): string {
  const clean = bookingId.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length <= 4) return clean.toUpperCase().padStart(4, "0");
  const tail = clean.slice(-4).toUpperCase();
  const head = clean.charAt(0).toUpperCase();
  return `${head}${tail.slice(1)}`;
}

/** Parse owner reply: "1", "2", "1 A3F2", "approve A3F2" */
export function parseOwnerReplyWithRef(body: string): {
  action: "approve" | "reject" | "undo" | null;
  ref?: string;
} {
  const trimmed = body.trim();
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.replace(/[^\d]/g, "") ?? "";
  let action: "approve" | "reject" | "undo" | null = null;
  if (first === "1") action = "approve";
  else if (first === "2") action = "reject";
  else if (first === "9") action = "undo";
  else if (/^approve$/i.test(parts[0] ?? "")) action = "approve";
  else if (/^reject$/i.test(parts[0] ?? "")) action = "reject";
  else if (/^undo$/i.test(parts[0] ?? "")) action = "undo";

  const refPart = parts.find((p) => /^[A-Za-z0-9]{4}$/.test(p));
  return { action, ref: refPart?.toUpperCase() };
}

export function bookingIdMatchesRef(bookingId: string, ref: string): boolean {
  return bookingShortRef(bookingId) === ref.toUpperCase();
}
