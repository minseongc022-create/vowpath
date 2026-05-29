import { readFile, writeFile } from "fs/promises";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

export async function patchEnvLocal(updates: Record<string, string>): Promise<void> {
  let text = "";
  try {
    text = await readFile(ENV_PATH, "utf8");
  } catch {
    text = "";
  }

  const lines = text.split("\n");
  const keys = new Set(Object.keys(updates));

  const out: string[] = [];
  const written = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (keys.has(key)) {
      out.push(`${key}=${updates[key]}`);
      written.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!written.has(key)) {
      out.push(`${key}=${value}`);
    }
  }

  const body = out.join("\n").replace(/\n*$/, "\n");
  await writeFile(ENV_PATH, body, "utf8");
}
