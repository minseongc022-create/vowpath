import type { GeneratedJobCard } from "./job-card-ai";
import { getJobberGraphqlVersion } from "./jobber-config";
import { refreshJobberAccessToken } from "./jobber-oauth";
import {
  getJobberTokens,
  saveJobberTokens,
  type JobberTokenRecord,
} from "./jobber-tokens";
import { normalizePhone, parseCustomerName, parseUsAddress } from "./parse-contact";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

type GraphqlError = { message: string };
type UserError = { message: string; path?: string[] };

function formatPriorityLabel(priority: GeneratedJobCard["priority"]): string {
  if (priority === "P1") return "긴급(P1)";
  if (priority === "P2") return "당일(P2)";
  return "일반(P3)";
}

function cityZip(address: ReturnType<typeof parseUsAddress>): string {
  const city = address.city?.trim();
  const zip = address.postalCode?.trim();
  if (city && zip) return `${city} ${zip}`;
  if (city) return city;
  if (zip) return zip;
  return "";
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

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
  });

  const payload = (await response.json()) as {
    data?: T;
    errors?: GraphqlError[];
  };

  if (!response.ok || payload.errors?.length) {
    const msg =
      payload.errors?.map((e) => e.message).join("; ") || `HTTP ${response.status}`;
    console.error("[jobber-api]", msg);
    throw new Error(msg);
  }

  return payload.data as T;
}

async function getValidAccessToken(
  userId: string,
): Promise<{ accessToken: string; record: JobberTokenRecord }> {
  const record = await getJobberTokens(userId);
  if (!record) {
    throw new Error("JOBBER_NOT_CONNECTED");
  }

  const now = Date.now();
  if (record.expiresAt > now + 60_000) {
    return { accessToken: record.accessToken, record };
  }

  const refreshed = await refreshJobberAccessToken(record.refreshToken);
  const updated: JobberTokenRecord = {
    ...record,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? record.refreshToken,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
    updatedAt: new Date().toISOString(),
  };
  await saveJobberTokens(updated);
  return { accessToken: updated.accessToken, record: updated };
}

export async function fetchJobberAccount(userId: string): Promise<{
  accountId?: string;
  accountName?: string;
}> {
  const { accessToken, record } = await getValidAccessToken(userId);

  const data = await jobberGraphql<{
    account?: { id: string; name: string };
  }>(
    accessToken,
    `query AccountName {
      account { id name }
    }`,
  );

  const account = data.account;
  if (account) {
    const updated: JobberTokenRecord = {
      ...record,
      accountId: account.id,
      accountName: account.name,
      updatedAt: new Date().toISOString(),
    };
    await saveJobberTokens(updated);
  }

  return {
    accountId: account?.id,
    accountName: account?.name,
  };
}

function collectUserErrors(
  userErrors: UserError[] | undefined,
  label: string,
): void {
  if (userErrors?.length) {
    throw new Error(`${label}: ${userErrors.map((e) => e.message).join(", ")}`);
  }
}

export type JobberPushResult = {
  clientId: string;
  requestId: string;
  jobberWebUri?: string;
};

export async function pushJobCardToJobber(
  userId: string,
  card: GeneratedJobCard,
): Promise<JobberPushResult> {
  const { accessToken } = await getValidAccessToken(userId);
  const { firstName, lastName } = parseCustomerName(card.customerName);
  const address = parseUsAddress(card.address);
  const phone = normalizePhone(card.phone);

  const clientMutation = `
    mutation ClientCreate($input: ClientCreateInput!) {
      clientCreate(input: $input) {
        client { id jobberWebUri }
        userErrors { message path }
      }
    }
  `;

  const clientInput: Record<string, unknown> = {
    firstName,
    lastName,
    emails: [],
    phones: [],
    billingAddress: {
      street1: address.street1,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
    },
  };

  if (phone) {
    clientInput.phones = [{ number: phone, primary: true, description: "MAIN" }];
  }

  const clientData = await jobberGraphql<{
    clientCreate: {
      client: { id: string; jobberWebUri?: string } | null;
      userErrors: UserError[];
    };
  }>(accessToken, clientMutation, { input: clientInput });

  collectUserErrors(clientData.clientCreate.userErrors, "Client");

  const clientId = clientData.clientCreate.client?.id;
  if (!clientId) {
    throw new Error("Jobber client was not created");
  }

  const location = cityZip(address);
  const titleParts = [
    formatPriorityLabel(card.priority),
    clean(card.symptom),
    clean(card.customerName),
    location,
  ].filter(Boolean);
  const title = titleParts.join(" | ").slice(0, 120);
  const requestMutation = `
    mutation RequestCreate($input: RequestCreateInput!) {
      requestCreate(input: $input) {
        request { id jobberWebUri title }
        userErrors { message path }
      }
    }
  `;

  const requestData = await jobberGraphql<{
    requestCreate: {
      request: { id: string; jobberWebUri?: string; title?: string } | null;
      userErrors: UserError[];
    };
  }>(accessToken, requestMutation, {
    input: {
      clientId,
      title,
    },
  });

  collectUserErrors(requestData.requestCreate.userErrors, "Request");

  const request = requestData.requestCreate.request;
  if (!request?.id) {
    throw new Error("Jobber request was not created");
  }

  const structuredNote = [
    `긴급도: ${formatPriorityLabel(card.priority)}`,
    `증상: ${clean(card.symptom)}`,
    `고객: ${clean(card.customerName)} / ${clean(card.phone)}`,
    `주소: ${clean(card.address)}`,
    `요청 시간: ${clean(card.arrivalWindow)}`,
    "",
    "핵심 메모:",
    clean(card.dispatchNotes || card.jobberPasteBlock || "Unknown"),
  ].join("\n");

  const noteMessage = [
    structuredNote,
    card.jobberPasteBlock ? `\n\n원문 메모:\n${card.jobberPasteBlock}` : "",
    `\n\n— Sent via Vowpath`,
  ].join("");

  if (noteMessage.trim()) {
    const noteMutation = `
      mutation RequestCreateNote($requestId: EncodedId!, $input: RequestCreateNoteInput!) {
        requestCreateNote(requestId: $requestId, input: $input) {
          requestNote { id }
          userErrors { message path }
        }
      }
    `;

    const noteData = await jobberGraphql<{
      requestCreateNote: {
        requestNote: { id: string } | null;
        userErrors: UserError[];
      };
    }>(accessToken, noteMutation, {
      requestId: request.id,
      input: { message: noteMessage, pinned: true },
    });

    collectUserErrors(noteData.requestCreateNote.userErrors, "Request note");
  }

  return {
    clientId,
    requestId: request.id,
    jobberWebUri: request.jobberWebUri,
  };
}
