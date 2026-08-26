/**
 * 이미지 크기 검사 — 반려당하기 전에 우리가 먼저 확인한다
 *
 * ★ 실측으로 드러난 반려 사유
 *
 *   "썸네일 최소 크기 미달 — 썸네일 이미지가 최소 크기(600x600)보다
 *    작습니다. 600x600 이상의 이미지로 다시 등록해 주세요."
 *
 * 도매꾹 검색 응답의 `thumb`는 목록용 축소 이미지라 대개 300px 안팎이다.
 * 그걸 그대로 썸네일로 올리니 전부 반려됐다.
 *
 * ★ 왜 URL만 보고는 알 수 없나
 *
 * 주소에는 크기가 안 적혀 있다. 그래서 **실제로 받아서** 재야 한다.
 * 다행히 이미지 크기는 파일 맨 앞 헤더에 있어서, 전체를 내려받지 않고
 * 앞부분 몇 KB만 읽으면 알 수 있다.
 *
 * ★ 못 읽으면 어떻게 하나
 *
 * 크기를 확인하지 못한 이미지는 **통과시킨다**. 네트워크가 잠깐 안 되는
 * 것과 이미지가 작은 것은 다른 문제인데, 못 읽었다고 등록을 막으면
 * 멀쩡한 상품이 통째로 잘린다. 반려는 되돌릴 수 있지만 안 올리면
 * 그 상품은 영영 안 팔린다.
 */

export const IMAGE_DIMENSIONS_VERSION = "1.0";

/** 토스 썸네일 최소 크기 — 반려 메시지에 명시된 값 */
export const MIN_THUMBNAIL_PX = 600;

/** 헤더만 읽는다 — 전체를 받으면 상품마다 수 MB를 낭비한다 */
const HEADER_BYTES = 32 * 1024;
const FETCH_TIMEOUT_MS = 6000;

export type ImageSize = { width: number; height: number };

/**
 * PNG·JPEG·GIF·WebP 헤더에서 가로·세로를 읽는다.
 * 형식을 모르면 null — 지어내지 않는다.
 */
export function readImageSize(buf: Uint8Array): ImageSize | null {
  // ── PNG: 8바이트 시그니처 뒤 IHDR에 가로·세로가 빅엔디언 uint32로 있다
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }

  // ── GIF: "GIF87a"/"GIF89a" 뒤 리틀엔디언 uint16 두 개
  if (buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
  }

  // ── WebP: RIFF....WEBP
  if (
    buf.length >= 30 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const fmt = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (fmt === "VP8X") {
      // 24비트 리틀엔디언, 값은 (실제 - 1)
      const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
      const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
      return { width: w, height: h };
    }
    if (fmt === "VP8 ") {
      return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    }
    if (fmt === "VP8L" && buf.length >= 25) {
      const b = buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }

  // ── JPEG: SOF 마커(0xFFC0~0xFFCF, C4·C8·CC 제외)를 찾아 읽는다
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = (buf[i + 2] << 8) | buf[i + 3];
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { height: (buf[i + 5] << 8) | buf[i + 6], width: (buf[i + 7] << 8) | buf[i + 8] };
      }
      if (len <= 0) break;
      i += 2 + len;
    }
  }

  return null;
}

/**
 * 이미지 주소에서 크기를 잰다. 못 재면 null.
 *
 * Range 헤더로 앞부분만 요청한다 — 공급처 서버가 Range를 무시해도
 * 우리가 읽는 양은 제한한다.
 */
export async function measureImage(url: string): Promise<ImageSize | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${HEADER_BYTES - 1}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok && res.status !== 206) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return readImageSize(buf.subarray(0, HEADER_BYTES));
  } catch {
    return null;
  }
}

export type ThumbnailChoice = {
  /** 썸네일로 쓸 주소 — 하나도 자격이 없으면 null */
  thumbnailUrl: string | null;
  /** 크기 미달로 뺀 주소들 (사유 표시용) */
  tooSmall: Array<{ url: string; size: ImageSize }>;
  /** 크기를 확인하지 못한 주소 수 */
  unmeasured: number;
};

/**
 * 후보 중에서 토스 썸네일 기준(600x600)을 넘는 것을 고른다.
 *
 * 크기를 못 잰 이미지는 **쓸 수 있는 것으로 본다** — 네트워크 문제로
 * 못 잰 것과 실제로 작은 것은 다르고, 전자 때문에 등록을 막으면
 * 멀쩡한 상품이 잘린다. 확인된 미달만 뺀다.
 */
export async function pickThumbnail(candidates: string[]): Promise<ThumbnailChoice> {
  const tooSmall: Array<{ url: string; size: ImageSize }> = [];
  let unmeasured = 0;
  const fallbacks: string[] = [];

  for (const url of candidates) {
    if (!url) continue;
    const size = await measureImage(url);
    if (!size) {
      unmeasured += 1;
      fallbacks.push(url);
      continue;
    }
    if (size.width >= MIN_THUMBNAIL_PX && size.height >= MIN_THUMBNAIL_PX) {
      return { thumbnailUrl: url, tooSmall, unmeasured };
    }
    tooSmall.push({ url, size });
  }

  // 확인된 합격이 없으면, 못 잰 것 중 첫 번째를 쓴다 (위 원칙)
  return { thumbnailUrl: fallbacks[0] ?? null, tooSmall, unmeasured };
}
