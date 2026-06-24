import type { GeneratedJobCard } from "./job-card-ai";
import {
  formatJobberAddress,
  type JobberBookingRecord,
} from "./jobber-bookings";
import { getJobberGraphqlVersion } from "./jobber-config";
import { refreshJobberAccessToken } from "./jobber-oauth";
import {
  getJobberTokens,
  saveJobberTokens,
  type JobberTokenRecord,
} from "./jobber-tokens";
import { normalizePhone, parseCustomerName, parseUsAddress } from "./parse-contact";
import { parseJobberMoneyCents } from "./jobber-money";

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
    signal: AbortSignal.timeout(12_000),
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

  let refreshed;
  try {
    refreshed = await refreshJobberAccessToken(record.refreshToken);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message === "JOBBER_REFRESH_FAILED") {
      const { deleteJobberTokens } = await import("./jobber-tokens");
      await deleteJobberTokens(userId);
      throw new Error("JOBBER_NOT_CONNECTED");
    }
    throw e;
  }
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
  jobId?: string;
  visitId?: string;
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

type JobberRequestNode = {
  id: string;
  title?: string | null;
  requestStatus: string;
  contactName?: string | null;
  phone?: string | null;
  source: string;
  createdAt: string;
  jobberWebUri?: string | null;
  client?: { id: string; name?: string | null } | null;
  property?: {
    address?: {
      street1?: string;
      street2?: string;
      city?: string;
      province?: string;
      postalCode?: string;
    } | null;
  } | null;
  jobs?: { nodes: { id: string }[] } | null;
};

const REQUESTS_PAGE_SIZE = 50;
const MAX_REQUEST_PAGES = 20;

const REQUESTS_QUERY = `
  query JobberRequests($first: Int!, $after: String, $filter: RequestFilterAttributes) {
    requests(
      first: $first
      after: $after
      filter: $filter
      sort: [{ key: REQUESTED_AT, direction: DESCENDING }]
    ) {
      nodes {
        id
        title
        requestStatus
        contactName
        phone
        source
        createdAt
        jobberWebUri
        client { id name }
        property { address { street1 street2 city province postalCode } }
        jobs(first: 5) { nodes { id } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeRequestNode(node: JobberRequestNode): JobberBookingRecord {
  const address = formatJobberAddress(node.property);
  return {
    requestId: node.id,
    title: node.title?.trim() || "Work request",
    customerName: node.contactName?.trim() || node.client?.name?.trim() || "Unknown",
    address,
    phone: node.phone?.trim() || undefined,
    requestStatus: node.requestStatus,
    source: node.source,
    createdAt: node.createdAt,
    jobberWebUri: node.jobberWebUri ?? undefined,
    clientId: node.client?.id,
    jobIds: node.jobs?.nodes.map((j) => j.id) ?? [],
  };
}

function toIsoRange(start: Date, end: Date) {
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

async function fetchRequestsPage(
  accessToken: string,
  after: string | null,
  filter?: { createdAt: { from: string; to: string } },
): Promise<{
  nodes: JobberRequestNode[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const data = await jobberGraphql<{
    requests?: {
      nodes: JobberRequestNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(accessToken, REQUESTS_QUERY, {
    first: REQUESTS_PAGE_SIZE,
    after,
    filter: filter ?? null,
  });

  const requests = data.requests;
  return {
    nodes: requests?.nodes ?? [],
    hasNextPage: requests?.pageInfo.hasNextPage ?? false,
    endCursor: requests?.pageInfo.endCursor ?? null,
  };
}

/** Fetch Jobber work requests for a date range (paginated, server-side filter with client fallback). */
export async function fetchJobberRequestsInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<JobberBookingRecord[]> {
  const { accessToken } = await getValidAccessToken(userId);
  const range = toIsoRange(start, end);
  const collected: JobberBookingRecord[] = [];
  let after: string | null = null;
  let useClientFilter = false;

  for (let page = 0; page < MAX_REQUEST_PAGES; page += 1) {
    let nodes: JobberRequestNode[];
    let hasNextPage: boolean;
    let endCursor: string | null;

    try {
      const result = await fetchRequestsPage(
        accessToken,
        after,
        useClientFilter ? undefined : { createdAt: range },
      );
      nodes = result.nodes;
      hasNextPage = result.hasNextPage;
      endCursor = result.endCursor;
    } catch (e) {
      if (!useClientFilter && page === 0) {
        useClientFilter = true;
        after = null;
        continue;
      }
      throw e;
    }

    for (const node of nodes) {
      const booking = normalizeRequestNode(node);
      const created = new Date(booking.createdAt).getTime();
      if (created >= start.getTime() && created <= end.getTime()) {
        collected.push(booking);
      }
    }

    if (useClientFilter) {
      const oldest = nodes[nodes.length - 1];
      if (oldest && new Date(oldest.createdAt).getTime() < start.getTime()) {
        break;
      }
    }

    if (!hasNextPage || !endCursor) break;
    after = endCursor;
  }

  const byId = new Map<string, JobberBookingRecord>();
  for (const booking of collected) {
    byId.set(booking.requestId, booking);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type JobberInvoiceSnapshot = {
  invoiceId: string;
  invoiceNumber?: string;
  invoiceStatus: string;
  issuedDate?: string;
  collectedCents: number;
  invoicedCents: number;
  outstandingCents: number;
  jobberJobIds: string[];
  jobberWebUri?: string;
};

type JobberInvoiceNode = {
  id: string;
  invoiceNumber?: string;
  invoiceStatus: string;
  issuedDate?: string | null;
  createdAt?: string;
  jobberWebUri?: string | null;
  amounts?: {
    total?: unknown;
    paymentsTotal?: unknown;
    outstanding?: unknown;
  } | null;
  jobs?: { nodes: { id: string }[] } | null;
};

const INVOICES_PAGE_SIZE = 50;
const MAX_INVOICE_PAGES = 30;

const INVOICES_QUERY = `
  query JobberInvoices($first: Int!, $after: String, $filter: InvoiceFilterAttributes) {
    invoices(
      first: $first
      after: $after
      filter: $filter
      sort: [{ key: ISSUED_DATE, direction: DESCENDING }]
    ) {
      nodes {
        id
        invoiceNumber
        invoiceStatus
        issuedDate
        createdAt
        jobberWebUri
        amounts {
          total
          paymentsTotal
          outstanding
        }
        jobs(first: 10) {
          nodes { id }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeInvoiceNode(node: JobberInvoiceNode): JobberInvoiceSnapshot {
  return {
    invoiceId: node.id,
    invoiceNumber: node.invoiceNumber ?? undefined,
    invoiceStatus: node.invoiceStatus,
    issuedDate: node.issuedDate ?? node.createdAt ?? undefined,
    collectedCents: parseJobberMoneyCents(node.amounts?.paymentsTotal),
    invoicedCents: parseJobberMoneyCents(node.amounts?.total),
    outstandingCents: parseJobberMoneyCents(node.amounts?.outstanding),
    jobberJobIds: node.jobs?.nodes.map((j) => j.id) ?? [],
    jobberWebUri: node.jobberWebUri ?? undefined,
  };
}

async function fetchInvoicesPage(
  accessToken: string,
  after: string | null,
  filter?: { issuedDate: { from: string; to: string } },
): Promise<{
  nodes: JobberInvoiceNode[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const data = await jobberGraphql<{
    invoices?: {
      nodes: JobberInvoiceNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(accessToken, INVOICES_QUERY, {
    first: INVOICES_PAGE_SIZE,
    after,
    filter: filter ?? null,
  });

  const invoices = data.invoices;
  return {
    nodes: invoices?.nodes ?? [],
    hasNextPage: invoices?.pageInfo.hasNextPage ?? false,
    endCursor: invoices?.pageInfo.endCursor ?? null,
  };
}

/** Fetch Jobber invoices for a date range (paginated, server-side filter with client fallback). */
export async function fetchJobberInvoicesInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<JobberInvoiceSnapshot[]> {
  const { accessToken } = await getValidAccessToken(userId);
  const range = toIsoRange(start, end);
  const collected: JobberInvoiceSnapshot[] = [];
  let after: string | null = null;
  let useClientFilter = false;

  for (let page = 0; page < MAX_INVOICE_PAGES; page += 1) {
    let nodes: JobberInvoiceNode[];
    let hasNextPage: boolean;
    let endCursor: string | null;

    try {
      const result = await fetchInvoicesPage(
        accessToken,
        after,
        useClientFilter ? undefined : { issuedDate: range },
      );
      nodes = result.nodes;
      hasNextPage = result.hasNextPage;
      endCursor = result.endCursor;
    } catch (e) {
      if (!useClientFilter && page === 0) {
        useClientFilter = true;
        after = null;
        continue;
      }
      throw e;
    }

    for (const node of nodes) {
      const invoice = normalizeInvoiceNode(node);
      const issued = new Date(invoice.issuedDate ?? 0).getTime();
      if (issued >= start.getTime() && issued <= end.getTime()) {
        collected.push(invoice);
      }
    }

    if (useClientFilter) {
      const oldest = nodes[nodes.length - 1];
      const oldestDate = oldest?.issuedDate ?? oldest?.createdAt;
      if (oldestDate && new Date(oldestDate).getTime() < start.getTime()) {
        break;
      }
    }

    if (!hasNextPage || !endCursor) break;
    after = endCursor;
  }

  const byId = new Map<string, JobberInvoiceSnapshot>();
  for (const invoice of collected) {
    byId.set(invoice.invoiceId, invoice);
  }
  return [...byId.values()].sort((a, b) => {
    const ta = new Date(a.issuedDate ?? 0).getTime();
    const tb = new Date(b.issuedDate ?? 0).getTime();
    return tb - ta;
  });
}
