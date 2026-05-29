export function parseCustomerName(full: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = full.trim();
  if (!trimmed || trimmed === "Unknown") {
    return { firstName: "Unknown", lastName: "Customer" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "." };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

/** US-style address: "123 Main St, Austin, TX 78701" or single line */
export function parseUsAddress(raw: string): {
  street1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
} {
  const fallback = {
    street1: raw.trim() || "Address unknown",
    city: "Unknown",
    province: "TX",
    postalCode: "",
    country: "United States",
  };

  const text = raw.trim();
  if (!text || text === "Unknown") return fallback;

  const commaParts = text.split(",").map((p) => p.trim());
  if (commaParts.length >= 2) {
    const street1 = commaParts[0];
    const city = commaParts.length >= 3 ? commaParts[1] : "Unknown";
    const stateZip = commaParts[commaParts.length - 1];
    const match = stateZip.match(/^([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
    if (match) {
      return {
        street1,
        city,
        province: match[1].toUpperCase(),
        postalCode: match[2] ?? "",
        country: "United States",
      };
    }
    return { ...fallback, street1, city: commaParts[1] ?? "Unknown" };
  }

  const tail = text.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/i);
  if (tail && tail.index !== undefined) {
    const street1 = text.slice(0, tail.index).trim();
    return {
      street1: street1 || text,
      city: "Unknown",
      province: tail[1].toUpperCase(),
      postalCode: tail[2],
      country: "United States",
    };
  }

  return { ...fallback, street1: text };
}
