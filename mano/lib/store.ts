import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type {
  ManoProvider,
  ManoQuote,
  ManoReview,
  ManoServiceRequest,
  ManoStore,
} from "./types";
import { SEED_PROVIDERS, SEED_REQUESTS, SEED_REVIEWS } from "./seed";

const DATA_DIR = join(process.cwd(), ".data", "mano");
const STORE_FILE = join(DATA_DIR, "store.json");

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function defaultStore(): ManoStore {
  return {
    providers: [...SEED_PROVIDERS],
    requests: [...SEED_REQUESTS],
    quotes: [],
    reviews: [...SEED_REVIEWS],
  };
}

function normalizeStore(raw: Partial<ManoStore>): ManoStore {
  const base = defaultStore();
  return {
    providers: raw.providers?.length ? raw.providers : base.providers,
    requests: raw.requests?.length ? raw.requests : base.requests,
    quotes: raw.quotes ?? [],
    reviews: raw.reviews?.length ? raw.reviews : base.reviews,
  };
}

async function loadStore(): Promise<ManoStore> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(STORE_FILE, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<ManoStore>);
  } catch {
    const store = defaultStore();
    await saveStore(store);
    return store;
  }
}

async function saveStore(store: ManoStore): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // read-only FS on some hosts
  }
}

export async function getManoStore(): Promise<ManoStore> {
  return loadStore();
}

export async function listProviders(filters?: {
  category?: string;
  colonia?: string;
}): Promise<ManoProvider[]> {
  const store = await loadStore();
  return store.providers.filter((p) => {
    if (filters?.category && !p.categories.includes(filters.category as ManoProvider["categories"][number])) {
      return false;
    }
    if (filters?.colonia && !p.colonias.some((c) => c.toLowerCase().includes(filters.colonia!.toLowerCase()))) {
      return false;
    }
    return true;
  });
}

export async function getProvider(id: string): Promise<ManoProvider | null> {
  const store = await loadStore();
  return store.providers.find((p) => p.id === id) ?? null;
}

export async function createProvider(
  input: Omit<ManoProvider, "id" | "rating" | "reviewCount" | "jobsCompleted" | "verified" | "createdAt">,
): Promise<ManoProvider> {
  const store = await loadStore();
  const provider: ManoProvider = {
    ...input,
    id: newId("pro"),
    rating: 0,
    reviewCount: 0,
    jobsCompleted: 0,
    verified: false,
    createdAt: new Date().toISOString(),
  };
  store.providers.unshift(provider);
  await saveStore(store);
  return provider;
}

export async function listRequests(filters?: {
  status?: string;
  category?: string;
  phone?: string;
}): Promise<ManoServiceRequest[]> {
  const store = await loadStore();
  return store.requests
    .filter((r) => {
      if (filters?.status && r.status !== filters.status) return false;
      if (filters?.category && r.category !== filters.category) return false;
      if (filters?.phone && r.customerPhone !== filters.phone) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(id: string): Promise<ManoServiceRequest | null> {
  const store = await loadStore();
  return store.requests.find((r) => r.id === id) ?? null;
}

export async function createRequest(
  input: Omit<ManoServiceRequest, "id" | "status" | "createdAt" | "updatedAt" | "assignedProviderId">,
): Promise<ManoServiceRequest> {
  const store = await loadStore();
  const now = new Date().toISOString();
  const request: ManoServiceRequest = {
    ...input,
    id: newId("req"),
    status: "abierta",
    createdAt: now,
    updatedAt: now,
  };
  store.requests.unshift(request);
  await saveStore(store);
  return request;
}

export async function listQuotes(filters?: {
  requestId?: string;
  providerId?: string;
}): Promise<ManoQuote[]> {
  const store = await loadStore();
  return store.quotes.filter((q) => {
    if (filters?.requestId && q.requestId !== filters.requestId) return false;
    if (filters?.providerId && q.providerId !== filters.providerId) return false;
    return true;
  });
}

export async function createQuote(
  input: Omit<ManoQuote, "id" | "status" | "createdAt">,
): Promise<ManoQuote> {
  const store = await loadStore();
  const quote: ManoQuote = {
    ...input,
    id: newId("qte"),
    status: "pendiente",
    createdAt: new Date().toISOString(),
  };
  store.quotes.push(quote);
  const req = store.requests.find((r) => r.id === input.requestId);
  if (req && req.status === "abierta") {
    req.status = "con_ofertas";
    req.updatedAt = new Date().toISOString();
  }
  await saveStore(store);
  return quote;
}

export async function acceptQuote(quoteId: string): Promise<ManoServiceRequest | null> {
  const store = await loadStore();
  const quote = store.quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  quote.status = "aceptada";
  store.quotes
    .filter((q) => q.requestId === quote.requestId && q.id !== quoteId)
    .forEach((q) => {
      q.status = "rechazada";
    });
  const req = store.requests.find((r) => r.id === quote.requestId);
  if (req) {
    req.status = "asignada";
    req.assignedProviderId = quote.providerId;
    req.updatedAt = new Date().toISOString();
  }
  await saveStore(store);
  return req ?? null;
}

export async function listReviews(providerId?: string): Promise<ManoReview[]> {
  const store = await loadStore();
  return store.reviews.filter((r) => !providerId || r.providerId === providerId);
}

export async function getManoStats() {
  const store = await loadStore();
  const openRequests = store.requests.filter((r) =>
    ["abierta", "con_ofertas"].includes(r.status),
  ).length;
  const completedJobs = store.requests.filter((r) => r.status === "completada").length;
  return {
    providers: store.providers.length,
    verifiedProviders: store.providers.filter((p) => p.verified).length,
    openRequests,
    completedJobs,
    avgRating:
      store.providers.reduce((s, p) => s + p.rating, 0) / Math.max(store.providers.length, 1),
  };
}
