import { newAgreementId, saveAgreement } from "./store";
import type { MaintenanceAgreement } from "./types";

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function pick(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key]?.trim();
    if (v) return v;
  }
  return "";
}

function parsePriceCents(raw: string, fallback: number): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n < 1000 ? Math.round(n * 100) : Math.round(n);
}

function parseDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export async function importAgreementsFromCsv(
  userId: string,
  csvText: string,
  defaults: { planName: string; annualPriceCents: number; visitsPerYear: number },
): Promise<ImportResult> {
  const rows = parseCsv(csvText);
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const customerName = pick(row, "customer_name", "name", "customer");
    const customerPhone = pick(row, "customer_phone", "phone", "mobile");
    const serviceAddress = pick(row, "service_address", "address", "street");
    const planName = pick(row, "plan_name", "plan") || defaults.planName;
    const renewalDate =
      parseDate(pick(row, "renewal_date", "renewal", "expires")) ??
      parseDate(pick(row, "end_date"));
    const startDate = parseDate(pick(row, "start_date", "started")) ?? now.slice(0, 10);

    if (!customerName || !customerPhone) {
      result.skipped += 1;
      result.errors.push(`Row ${i + 2}: missing name or phone`);
      continue;
    }

    const annualPriceCents = parsePriceCents(
      pick(row, "annual_price", "price", "amount"),
      defaults.annualPriceCents,
    );
    const visitsRaw = pick(row, "visits_per_year", "visits");
    const visitsPerYear = visitsRaw ? Math.max(1, Math.round(Number(visitsRaw))) : defaults.visitsPerYear;

    const agreement: MaintenanceAgreement = {
      id: newAgreementId(),
      userId,
      customerName,
      customerPhone,
      customerEmail: pick(row, "email", "customer_email") || undefined,
      serviceAddress: serviceAddress || "On file",
      planName,
      annualPriceCents,
      visitsPerYear,
      status: "active",
      startDate,
      renewalDate:
        renewalDate ??
        (() => {
          const d = new Date(startDate);
          d.setFullYear(d.getFullYear() + 1);
          return d.toISOString().slice(0, 10);
        })(),
      notes: pick(row, "notes", "note") || undefined,
      source: "import",
      createdAt: now,
      updatedAt: now,
    };

    await saveAgreement(agreement);
    result.imported += 1;
  }

  return result;
}
