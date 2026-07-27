import {
  formatQuoteAmount,
  isInChaseQueue,
  isOpenQuote,
  quoteAmountCents,
  type QuotePipelineStage,
} from "../quote-chase";
import type { JobCard } from "../types";
import { CLOSEPING_PRODUCT, isClosePingJob, parseClosePingCsv, stageLabel } from "./csv-import";

export {
  CLOSEPING_PRODUCT,
  isClosePingJob,
  parseClosePingCsv,
  stageLabel,
  type CsvImportRow,
} from "./csv-import";

export type ClosePingStats = {
  openCount: number;
  chasingCount: number;
  wonThisMonth: number;
  pipelineCents: number;
  recoveredCents: number;
};

export function computeClosePingStats(jobs: JobCard[]): ClosePingStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let openCount = 0;
  let chasingCount = 0;
  let wonThisMonth = 0;
  let pipelineCents = 0;
  let recoveredCents = 0;

  for (const job of jobs) {
    const amount = quoteAmountCents(job) ?? 0;

    if (isOpenQuote(job)) {
      openCount += 1;
      pipelineCents += amount;
    }
    if (isInChaseQueue(job)) {
      chasingCount += 1;
    }
    if (
      (job.status === "scheduled" || job.status === "completed") &&
      job.quoteSentToCustomerAt &&
      new Date(job.quoteSentToCustomerAt).getTime() >= monthStart
    ) {
      wonThisMonth += 1;
      recoveredCents += amount;
    }
  }

  return { openCount, chasingCount, wonThisMonth, pipelineCents, recoveredCents };
}

export function formatPipelineValue(cents: number): string {
  return formatQuoteAmount(cents);
}

export type { QuotePipelineStage };
