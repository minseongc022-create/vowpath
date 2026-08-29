/**
 * 6단계 — Hookable의 시그니처 기능: 상품 이미지로 GIF 자동 생성
 *
 * 실제 상품 사진들을 동일 크기로 맞춰 프레임으로 잇는다 — 새로 그리는 이미지가
 * 아니라 있는 사진을 순환시키는 애니메이션이다. sharp의 animated-join 출력을
 * 사용한다(별도 GIF 인코딩 의존성 추가 없이, 이미 이 저장소의 의존성인 sharp로
 * 처리 가능함을 확인했다).
 */

import sharp from "sharp";
import type { GifResult } from "./types";

export const GIF_GENERATOR_VERSION = "1.0";

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export type GifOptions = {
  maxFrames?: number;
  size?: number;
  delayMs?: number;
};

export async function generateProductGif(imageUrls: string[], opts: GifOptions = {}): Promise<GifResult | null> {
  const maxFrames = opts.maxFrames ?? 5;
  const size = opts.size ?? 600;
  const delayMs = opts.delayMs ?? 900;

  const candidates = imageUrls.slice(0, maxFrames);
  if (!candidates.length) return null;

  const buffers = await Promise.all(candidates.map(fetchImageBuffer));
  const valid = buffers.filter((b): b is Buffer => Boolean(b));
  if (valid.length < 1) return null;

  try {
    const frames = await Promise.all(
      valid.map((buf) =>
        sharp(buf)
          .resize(size, size, { fit: "cover", position: "attention" })
          .png()
          .toBuffer(),
      ),
    );

    const gif = await sharp(frames, { join: { animated: true, across: 1 } })
      .gif({ loop: 0, delay: frames.map(() => delayMs), colors: 128 })
      .toBuffer();

    return {
      dataUrl: `data:image/gif;base64,${gif.toString("base64")}`,
      frameCount: frames.length,
      width: size,
      height: size,
      bytes: gif.length,
    };
  } catch {
    return null;
  }
}
