import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BrandSchema, type Brand } from "./types.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, "../..");
export const BRANDS_DIR = join(ROOT, "brands");

export function loadBrand(id: string): Brand {
  const path = join(BRANDS_DIR, `${id}.brand.json`);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return BrandSchema.parse(raw);
}

export function listBrands(): string[] {
  return readdirSync(BRANDS_DIR)
    .filter((f) => f.endsWith(".brand.json"))
    .map((f) => f.replace(/\.brand\.json$/, ""));
}

export function loadAllBrands(): Brand[] {
  return listBrands().map(loadBrand);
}

export function loadEnvFile(): void {
  try {
    const envPath = join(ROOT, ".env");
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}
