import { paddleApiBaseUrl } from "@/lib/paddle-config";

export class PaddleApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "PaddleApiError";
    this.status = status;
    this.body = body;
  }
}

export async function paddleFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY not configured");

  const res = await fetch(`${paddleApiBaseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new PaddleApiError(`Paddle API error ${res.status}`, res.status, json);
  }
  return json as T;
}
