import { getJobberGraphqlVersion } from "../jobber-config";
import { refreshJobberAccessToken } from "../jobber-oauth";
import {
  getJobberTokens,
  saveJobberTokens,
  type JobberTokenRecord,
} from "../jobber-tokens";
import type { BusyBlock } from "./compute-slots";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

type GraphqlError = { message: string };

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
    signal: AbortSignal.timeout(12_000),
  });

  const payload = (await response.json()) as {
    data?: T;
    errors?: GraphqlError[];
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

const SCHEDULED_ITEMS_QUERY = `
  query ScheduledItems($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
    scheduledItems(
      filter: {
        startsBetween: { from: $from, to: $to }
        scheduledItemType: [VISIT, ASSESSMENT, EVENT, TASK]
        schedulingAspect: ALL
      }
      sort: [{ key: START_AT, direction: ASCENDING }]
      first: 100
    ) {
      nodes {
        id
        title
        startAt
        endAt
        ... on Visit {
          client { id name }
        }
      }
    }
  }
`;

export type JobberScheduleItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  clientName?: string;
};

export async function fetchJobberScheduleItems(
  userId: string,
  from: Date,
  to: Date,
): Promise<JobberScheduleItem[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  try {
    const data = await jobberGraphql<{
      scheduledItems?: {
        nodes: Array<{
          id: string;
          title?: string | null;
          startAt?: string | null;
          endAt?: string | null;
          client?: { name?: string | null } | null;
        }>;
      };
    }>(accessToken, SCHEDULED_ITEMS_QUERY, {
      from: from.toISOString(),
      to: to.toISOString(),
    });

    return (data.scheduledItems?.nodes ?? [])
      .filter((n) => n.startAt && n.endAt)
      .map((n) => ({
        id: n.id,
        title: n.title?.trim() || "Visit",
        startAt: n.startAt!,
        endAt: n.endAt!,
        clientName: n.client?.name?.trim() || undefined,
      }));
  } catch (e) {
    console.warn("[jobber-schedule-api]", e);
    return [];
  }
}

export async function fetchJobberBusyBlocks(
  userId: string,
  from: Date,
  to: Date,
): Promise<BusyBlock[]> {
  const items = await fetchJobberScheduleItems(userId, from, to);
  return items.map((i) => ({ startAt: i.startAt, endAt: i.endAt }));
}

export async function isJobberConnected(userId: string): Promise<boolean> {
  return Boolean(await getJobberTokens(userId));
}
