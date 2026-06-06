import { useKvStore } from "./kv-config";

export type StorageStatus = {
  configured: boolean;
  provider: "vercel_kv" | "upstash" | "local_file" | "none";
  productionReady: boolean;
  message: string;
};

export function getStorageStatus(): StorageStatus {
  const kvUrl = process.env.KV_REST_API_URL?.trim();
  const kvToken = process.env.KV_REST_API_TOKEN?.trim();
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (kvUrl && kvToken) {
    return {
      configured: true,
      provider: "vercel_kv",
      productionReady: true,
      message: "Vercel KV connected.",
    };
  }

  if (upstashUrl && upstashToken) {
    return {
      configured: true,
      provider: "upstash",
      productionReady: true,
      message: "Upstash Redis connected.",
    };
  }

  if (process.env.VERCEL === "1") {
    return {
      configured: false,
      provider: "none",
      productionReady: false,
      message:
        "Production requires KV_REST_API_* or UPSTASH_REDIS_REST_* env vars. Attach Vercel KV or Upstash to this project, then redeploy.",
    };
  }

  return {
    configured: true,
    provider: "local_file",
    productionReady: false,
    message: "Using local data/ files (development only).",
  };
}

export function isProductionStorageReady(): boolean {
  return getStorageStatus().productionReady || useKvStore();
}
