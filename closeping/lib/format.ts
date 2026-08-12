export const CHASE_INTERVALS_DAYS = [2, 7, 14] as const;

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function chaseStageLabel(i: number): string {
  const d = CHASE_INTERVALS_DAYS[i];
  if (d === 2) return "48h";
  if (d === 7) return "7d";
  if (d === 14) return "14d";
  return `Day ${d}`;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw.trim();
  return raw.trim();
}

export function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [] as Array<{
    customerName: string;
    customerPhone: string;
    description: string;
    amountCents: number;
    address?: string;
  }>;

  const header = lines[0]!.toLowerCase();
  const hasHeader =
    header.includes("name") || header.includes("phone") || header.includes("amount");
  const data = hasHeader ? lines.slice(1) : lines;
  const rows = [];
  for (const line of data) {
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 4) continue;
    const [name, phone, desc, amountRaw, address] = parts;
    const amount = Math.round(parseFloat(amountRaw!.replace(/[$,]/g, "")) * 100);
    if (!name || !phone || !Number.isFinite(amount) || amount <= 0) continue;
    rows.push({
      customerName: name,
      customerPhone: phone,
      description: desc ?? "Estimate",
      amountCents: amount,
      address,
    });
  }
  return rows;
}
