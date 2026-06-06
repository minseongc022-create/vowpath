import { mkdir, writeFile } from "fs/promises";
import path from "path";
import os from "os";

const DATA_DIR =
  process.env.VERCEL === "1"
    ? path.join(os.tmpdir(), "vowpath-intake-photos")
    : path.join(process.cwd(), "data", "intake-photos");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function intakePhotoExtension(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function saveIntakePhoto(
  token: string,
  buffer: Buffer,
  mime: string,
): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  if (!ALLOWED.has(mime)) {
    return { ok: false, error: "Please upload a JPEG or PNG photo." };
  }
  if (buffer.length > MAX_BYTES) {
    return { ok: false, error: "Photo must be 5 MB or smaller." };
  }
  await mkdir(DATA_DIR, { recursive: true });
  const ext = intakePhotoExtension(mime);
  const filename = `${token}.${ext}`;
  const fullPath = path.join(DATA_DIR, filename);
  await writeFile(fullPath, buffer);
  return { ok: true, ref: `intake-photo:${filename}` };
}
