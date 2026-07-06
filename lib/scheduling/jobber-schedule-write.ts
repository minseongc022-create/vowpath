import type { GeneratedJobCard } from "../job-card-ai";
import { getJobberGraphqlVersion } from "../jobber-config";
import { pushJobCardToJobber, type JobberPushResult } from "../jobber-api";
import { refreshJobberAccessToken } from "../jobber-oauth";
import {
  getJobberTokens,
  saveJobberTokens,
  type JobberTokenRecord,
} from "../jobber-tokens";
import { upsertScheduledBooking } from "../schedule-bookings-db";
import { logOperationFailure } from "../ops-failures";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

type UserError = { message: string; path?: string[] };

async function jobberGraphql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": getJobberGraphqlVersion(),
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (!response.ok || payload.errors?.length) {
    const msg =
      payload.errors?.map((e) => e.message).join("; ") || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  return payload.data as T;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const record = await getJobberTokens(userId);
  if (!record) return null;

  if (record.expiresAt > Date.now() + 60_000) {
    return record.accessToken;
  }

  try {
    const refreshed = await refreshJobberAccessToken(record.refreshToken);
    const updated: JobberTokenRecord = {
      ...record,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? record.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      updatedAt: new Date().toISOString(),
    };
    await saveJobberTokens(updated);
    return updated.accessToken;
  } catch {
    return null;
  }
}

function collectUserErrors(userErrors: UserError[] | undefined, label: string): void {
  if (userErrors?.length) {
    throw new Error(`${label}: ${userErrors.map((e) => e.message).join(", ")}`);
  }
}

const REQUEST_CONTEXT_QUERY = `
  query RequestContext($id: EncodedId!) {
    request(id: $id) {
      id
      client { id }
      property { id }
      jobs(first: 1) { nodes { id } }
    }
  }
`;

const JOB_CREATE_MUTATION = `
  mutation JobCreate($input: JobCreateInput!) {
    jobCreate(input: $input) {
      job { id jobberWebUri }
      userErrors { message path }
    }
  }
`;

const VISIT_CREATE_MUTATION = `
  mutation VisitCreate($jobId: EncodedId!, $visit: VisitCreateInput!) {
    visitCreate(jobId: $jobId, visit: $visit) {
      visit { id startAt endAt }
      userErrors { message path }
    }
  }
`;

export type JobberSchedulePushResult = JobberPushResult & {
  jobId?: string;
  visitId?: string;
};

async function ensureJobForRequest(
  accessToken: string,
  requestId: string,
  clientId: string,
  card: GeneratedJobCard,
): Promise<string> {
  const ctx = await jobberGraphql<{
    request?: {
      client?: { id: string } | null;
      property?: { id: string } | null;
      jobs?: { nodes: { id: string }[] } | null;
    } | null;
  }>(accessToken, REQUEST_CONTEXT_QUERY, { id: requestId });

  const existing = ctx.request?.jobs?.nodes?.[0]?.id;
  if (existing) return existing;

  const propertyId = ctx.request?.property?.id;
  const input: Record<string, unknown> = {
    clientId: ctx.request?.client?.id ?? clientId,
    title: card.symptom?.trim().slice(0, 120) || "Service visit",
    instructions: card.dispatchNotes?.trim() || card.arrivalWindow,
  };
  if (propertyId) input.propertyId = propertyId;

  const created = await jobberGraphql<{
    jobCreate: {
      job: { id: string } | null;
      userErrors: UserError[];
    };
  }>(accessToken, JOB_CREATE_MUTATION, { input });

  collectUserErrors(created.jobCreate.userErrors, "Job");
  const jobId = created.jobCreate.job?.id;
  if (!jobId) throw new Error("Jobber job was not created");
  return jobId;
}

async function createVisitOnJob(
  accessToken: string,
  jobId: string,
  schedule: { startAt: string; endAt: string; label: string },
  card: GeneratedJobCard,
): Promise<string> {
  const visitInput = {
    visits: [
      {
        schedule: {
          startAt: { isoTimestamp: schedule.startAt },
          endAt: { isoTimestamp: schedule.endAt },
        },
        title: schedule.label,
        instructions: card.dispatchNotes?.trim() || card.symptom,
      },
    ],
  };

  const created = await jobberGraphql<{
    visitCreate: {
      visit: { id: string } | null;
      userErrors: UserError[];
    };
  }>(accessToken, VISIT_CREATE_MUTATION, {
    jobId,
    visit: visitInput,
  });

  collectUserErrors(created.visitCreate.userErrors, "Visit");
  const visitId = created.visitCreate.visit?.id;
  if (!visitId) throw new Error("Jobber visit was not created");
  return visitId;
}

/**
 * Create Jobber request + job + scheduled visit for a customer-picked window.
 */
export async function pushJobberScheduledBooking(
  userId: string,
  bookingId: string,
  card: GeneratedJobCard,
  schedule: { startAt: string; endAt: string; label: string },
): Promise<JobberSchedulePushResult | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  try {
    const base = await pushJobCardToJobber(userId, card);
    const jobId = await ensureJobForRequest(
      accessToken,
      base.requestId,
      base.clientId,
      card,
    );
    const visitId = await createVisitOnJob(accessToken, jobId, schedule, card);

    // The Jobber job + visit already exist at this point — if local bookkeeping
    // fails, we must NOT throw (that would signal total failure and invite a
    // caller retry, which would create a duplicate Jobber job/visit since
    // Jobber already has this one). Log it and still return success so the
    // caller records jobberRequestId/jobberJobId and treats this as linked.
    try {
      await upsertScheduledBooking(userId, {
        bookingId,
        scheduledStartAt: schedule.startAt,
        scheduledEndAt: schedule.endAt,
        arrivalWindowLabel: schedule.label,
        slotSource: "jobber",
        jobberRequestId: base.requestId,
        jobberJobId: jobId,
        jobberVisitId: visitId,
      });
    } catch (e) {
      await logOperationFailure({
        userId,
        category: "jobber",
        operation: "pushJobberScheduledBooking.upsertScheduledBooking",
        message: e instanceof Error ? e.message : "Local schedule bookkeeping failed after Jobber push succeeded",
        retryable: false,
        payload: { bookingId, jobId, visitId },
      });
    }

    return { ...base, jobId, visitId };
  } catch (e) {
    await logOperationFailure({
      userId,
      category: "jobber",
      operation: "pushJobberScheduledBooking",
      message: e instanceof Error ? e.message : "Jobber schedule write failed",
      retryable: true,
      payload: { bookingId },
    });
    throw e;
  }
}
