import { addJobRecord, listJobs, patchJobRecord, type StoredJob } from "../jobs-db";
import { notifyCustomerQuoteSent } from "../customer-sms";
import { quoteAmountCents } from "../quote-chase";
import { CLOSEPING_PRODUCT, isClosePingJob, parseClosePingCsv } from "./csv-import";

export {
  CLOSEPING_PRODUCT,
  computeClosePingStats,
  formatPipelineValue,
  isClosePingJob,
  parseClosePingCsv,
  stageLabel,
  type ClosePingStats,
  type CsvImportRow,
} from "./quotes-core";

export async function listClosePingJobs(userId: string): Promise<StoredJob[]> {
  const jobs = await listJobs(userId);
  return jobs.filter(isClosePingJob);
}

export type CreateClosePingQuoteInput = {
  customerName: string;
  customerPhone: string;
  jobDescription: string;
  amountCents: number;
  address?: string;
  trade?: string;
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw.trim();
  return raw.trim();
}

export async function createClosePingQuote(
  userId: string,
  input: CreateClosePingQuoteInput,
): Promise<StoredJob> {
  const name = input.customerName.trim().slice(0, 80) || "Customer";
  const phone = normalizePhone(input.customerPhone);
  const description = input.jobDescription.trim().slice(0, 500) || "Estimate";
  const cents = Math.round(input.amountCents);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  return addJobRecord(userId, {
    priority: "P3",
    symptom: description,
    customerName: name,
    address: input.address?.trim().slice(0, 200) ?? "",
    arrivalWindow: input.trade?.trim().slice(0, 80) ?? "Estimate",
    status: "pending_review",
    requestKind: "estimate",
    productSource: CLOSEPING_PRODUCT,
    customerPhone: phone,
    quotedAmountCents: cents,
    quotedAt: new Date().toISOString(),
  });
}

export async function sendClosePingQuote(
  userId: string,
  jobId: string,
): Promise<{ job: StoredJob; sent: boolean }> {
  const jobs = await listClosePingJobs(userId);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("NOT_FOUND");

  const amount = quoteAmountCents(job);
  if (!amount) throw new Error("NO_AMOUNT");

  const phone = job.customerPhone ?? job.estimateDoc?.customerPhone;
  if (!phone?.trim()) throw new Error("NO_PHONE");

  const sent = await notifyCustomerQuoteSent({
    userId,
    bookingId: job.id,
    phone,
    amountCents: amount,
    customerName: job.customerName,
  });
  if (!sent.ok) throw new Error(sent.reason ?? "SMS_FAILED");

  const now = new Date().toISOString();
  const saved = await patchJobRecord(userId, job.id, {
    quoteSentToCustomerAt: now,
    quoteFollowUpSentAt: undefined,
    quoteChaseSentAt: [],
    closepingChaseConsentAt: now,
    customerPhone: phone,
  });
  if (!saved) throw new Error("NOT_FOUND");
  return { job: saved, sent: true };
}

export async function updateClosePingQuoteStatus(
  userId: string,
  jobId: string,
  status: "won" | "lost",
): Promise<StoredJob> {
  const jobs = await listClosePingJobs(userId);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("NOT_FOUND");

  const patch =
    status === "won"
      ? { status: "scheduled" as const }
      : { status: "rejected" as const };

  const saved = await patchJobRecord(userId, job.id, patch);
  if (!saved) throw new Error("NOT_FOUND");
  return saved;
}

export async function importClosePingCsv(
  userId: string,
  csv: string,
): Promise<StoredJob[]> {
  const rows = parseClosePingCsv(csv);
  const created: StoredJob[] = [];
  for (const row of rows.slice(0, 50)) {
    created.push(await createClosePingQuote(userId, row));
  }
  return created;
}
