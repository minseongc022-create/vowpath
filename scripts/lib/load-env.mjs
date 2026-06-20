import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Load .env.local into process.env (does not override existing). */
export function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return false;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
  return true;
}

export function authSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    "dev-only-change-auth-secret-32chars-minimum"
  );
}
