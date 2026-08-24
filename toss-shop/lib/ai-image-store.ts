/**
 * Jarvis AI 생성 이미지 저장소 — 배경 재구성·인포그래픽 배지 결과물을
 * KV(프로덕션) 또는 로컬 파일(개발)에 저장하고 공개 URL로 서빙한다.
 *
 * giu/lib/product-image-store.ts와 같은 패턴 (KV 우선, 로컬 폴백, sharp로 정규화).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { kv } from "@vercel/kv";
import { useKvStore } from "@/lib/kv-config";
import { kvGetSafe } from "@/lib/kv-safe";

const KV_PREFIX = "toss-shop:ai-image:";
const DATA_DIR = join(process.cwd(), ".data", "toss-shop", "ai-images");
const MAX_BYTES = 3 * 1024 * 1024;
/** KV·로컬 저장은 무료가 아니다 — 생성 이미지는 계속 쌓이므로 TTL을 둔다 */
const KV_TTL_SECONDS = 60 * 60 * 24 * 90; // 90일

type StoredAiImage = {
  mime: "image/jpeg";
  data: string;
  createdAt: string;
};

function imageId(): string {
  return randomBytes(12).toString("hex");
}

export function aiImagePublicPath(id: string): string {
  return `/api/toss-shop/ai-images/${id}`;
}

/** base64(PNG/JPEG) 원본을 받아 정규화된 JPEG로 저장하고 공개 URL을 반환 */
export async function saveAiImage(base64: string): Promise<{ id: string; url: string } | { error: string }> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { error: "이미지 디코딩 실패" };
  }
  if (!buffer.length) return { error: "빈 이미지" };

  let jpeg: Buffer;
  try {
    jpeg = await sharp(buffer, { failOn: "none" })
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  } catch {
    return { error: "이미지 처리 실패" };
  }
  if (jpeg.length > MAX_BYTES) {
    return { error: "생성된 이미지가 너무 큼" };
  }

  const id = imageId();
  const entry: StoredAiImage = { mime: "image/jpeg", data: jpeg.toString("base64"), createdAt: new Date().toISOString() };

  if (useKvStore()) {
    await kv.set(KV_PREFIX + id, entry, { ex: KV_TTL_SECONDS });
  } else {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(join(DATA_DIR, `${id}.json`), JSON.stringify(entry));
    } catch {
      return { error: "로컬 저장 실패" };
    }
  }

  return { id, url: aiImagePublicPath(id) };
}

export async function loadAiImage(id: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;

  let entry: StoredAiImage | null = null;
  if (useKvStore()) {
    entry = await kvGetSafe<StoredAiImage>(KV_PREFIX + id);
  } else {
    try {
      const raw = await readFile(join(DATA_DIR, `${id}.json`), "utf8");
      entry = JSON.parse(raw) as StoredAiImage;
    } catch {
      return null;
    }
  }
  if (!entry) return null;
  return { buffer: Buffer.from(entry.data, "base64"), mime: entry.mime };
}
