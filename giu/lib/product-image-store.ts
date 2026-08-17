import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { kv } from "@vercel/kv";
import { detectImageMime } from "@/giu/lib/detect-image-mime";
import { kvGetSafe } from "@/lib/kv-safe";

const KV_PREFIX = "giu:product-image:";
const DATA_DIR = join(process.cwd(), ".data", "giu", "product-images");
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

type StoredProductImage = {
  mime: "image/jpeg";
  data: string;
  createdAt: string;
};

function kvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim(),
  );
}

function imageId(): string {
  return randomBytes(12).toString("hex");
}

export function productImagePublicPath(id: string): string {
  return `/api/giu/product-images/${id}`;
}

export async function saveProductImage(
  buffer: Buffer,
  mime: string,
  filename?: string,
): Promise<{ id: string; url: string } | { error: string }> {
  const resolved =
    mime && ALLOWED.has(mime) ? mime : detectImageMime(buffer, filename) ?? mime;
  if (!resolved || !ALLOWED.has(resolved)) {
    return { error: "JPEG·PNG·HEIC 사진만 올릴 수 있어요" };
  }
  if (buffer.length > 8 * 1024 * 1024) {
    return { error: "사진은 8MB 이하로 올려 주세요" };
  }

  let jpeg: Buffer;
  try {
    jpeg = await sharp(buffer)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return { error: "사진을 처리할 수 없어요" };
  }

  if (jpeg.length > MAX_BYTES) {
    return { error: "사진이 너무 커요. 다른 사진을 선택해 주세요" };
  }

  const id = imageId();
  const entry: StoredProductImage = {
    mime: "image/jpeg",
    data: jpeg.toString("base64"),
    createdAt: new Date().toISOString(),
  };

  if (kvConfigured()) {
    await kv.set(`${KV_PREFIX}${id}`, entry);
  } else {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, `${id}.json`), JSON.stringify(entry));
  }

  return { id, url: productImagePublicPath(id) };
}

export async function loadProductImage(
  id: string,
): Promise<{ buffer: Buffer; mime: "image/jpeg" } | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;

  let entry: StoredProductImage | null = null;
  if (kvConfigured()) {
    entry = await kvGetSafe<StoredProductImage>(`${KV_PREFIX}${id}`);
  } else {
    try {
      const raw = await readFile(join(DATA_DIR, `${id}.json`), "utf8");
      entry = JSON.parse(raw) as StoredProductImage;
    } catch {
      entry = null;
    }
  }

  if (!entry?.data) return null;
  return { buffer: Buffer.from(entry.data, "base64"), mime: "image/jpeg" };
}
