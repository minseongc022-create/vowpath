export const CLOSEPING_PRODUCT = "closeping" as const;

export function isClosePingJob(job: { productSource?: string }): boolean {
  return job.productSource === CLOSEPING_PRODUCT;
}

export type CsvImportRow = {
  customerName: string;
  customerPhone: string;
  jobDescription: string;
  amountCents: number;
  address?: string;
};

export function parseClosePingCsv(text: string): CsvImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0]!.toLowerCase();
  const hasHeader =
    header.includes("name") || header.includes("phone") || header.includes("amount");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: CsvImportRow[] = [];
  for (const line of dataLines) {
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 4) continue;
    const [name, phone, desc, amountRaw, address] = parts;
    const amount = Math.round(parseFloat(amountRaw!.replace(/[$,]/g, "")) * 100);
    if (!name || !phone || !Number.isFinite(amount) || amount <= 0) continue;
    rows.push({
      customerName: name,
      customerPhone: phone,
      jobDescription: desc ?? "Estimate",
      amountCents: amount,
      address,
    });
  }
  return rows;
}

export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    lead: "New",
    draft: "Draft",
    ready: "Ready to send",
    sent: "Sent",
    chasing: "Chasing",
    booked: "Won",
    closed: "Closed",
  };
  return labels[stage] ?? stage;
}
