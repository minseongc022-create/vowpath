/**
 * 실사진 클로즈업 컷 생성 — 공급처 사진이 적을 때 우리가 "더 만든다"
 *
 * ★ 사장님 지시
 *
 * "진짜 다른 각도에서 찍은 것처럼 해줘야 하고, 공급처에서 제공하는
 * 사진이 별로 없으면 우리가 더 만들어서 더 자세하고 고퀄리티 상세페이지를
 * 만들어야 해." — 단, 이전에 이미 합의한 원칙은 그대로 지킨다: **안 보이는
 * 곳을 추측해서 그리면 안 되고, 보이는 곳을 다른 각도에서 찍은 것처럼만
 * 만들어야 한다.**
 *
 * ★ 왜 AI 이미지 생성이 아니라 실제 사진을 자르는 방식인가
 *
 * AI 이미지 생성(DALL-E류)은 "그럴듯한" 이미지를 새로 그리는 것이다.
 * 그 순간부터 그 이미지는 이 상품의 실제 사진이 아니라 **모델이 상상한
 * 비슷한 물건**이 된다. 조금이라도 다르게 나오면 그게 정확히 사장님이
 * 처음부터 금지한 "모습이 변형되거나 다른 상품처럼 보이는" 상황이다.
 *
 * 그래서 이 파일은 생성하지 않는다 — **자른다**. 공급처의 진짜 사진
 * 픽셀을 그대로 가져와 다른 영역을 확대해서 보여준다. 이건 그림을 새로
 * 그리는 게 아니라 같은 사진을 다르게 프레이밍하는 것이라, 무엇을 보여주든
 * 100% 실물이다 — "다른 상품처럼 보일" 가능성이 구조적으로 없다.
 *
 * ★ 무엇을 하는가
 *
 *  1. 정방향 보정본 — 원본을 살짝 선명하게·화이트밸런스 정리만 하고
 *     구도는 그대로 (색이 칙칙하게 찍힌 도매 사진을 상품처럼 보이게)
 *  2. 중앙 클로즈업 — 가운데 60%를 잘라 확대 (제품의 중심부 디테일)
 *  3. 상단 클로즈업 — 위쪽 65%를 잘라 확대 (라벨·상단부가 잘 나오는 경우가 많다)
 *
 * 셋 다 "어디를 가리키는지"를 주장하지 않는다 — 화살표나 원형 표시로
 * 특정 부위를 지목하면 그 지목이 틀렸을 때 오도가 된다. 그냥 "클로즈업"
 * 이라고만 부른다 — 그건 항상 사실이다.
 */

import sharp from "sharp";
import { saveAiImage } from "../ai-image-store";

export const IMAGE_DETAIL_SHOTS_VERSION = "1.0";

function absoluteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://effiroad.com";
}

/** 원본 대비 다운로드 상한 — 비정상적으로 큰 파일에 시간을 쓰지 않는다 */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_SOURCE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_SOURCE_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

/**
 * 잘라낼 영역을 계산한다 — 순수 함수라 sharp·네트워크 없이 테스트할 수 있다.
 *
 * @param widthRatio  가로 폭 중 남길 비율 (0~1)
 * @param heightRatio 세로 폭 중 남길 비율 (0~1)
 * @param vAnchor     세로 기준점 — "center"는 가운데, "top"은 위쪽에 붙여 자른다
 */
export function computeCropRect(
  width: number,
  height: number,
  widthRatio: number,
  heightRatio: number,
  vAnchor: "center" | "top" = "center",
): { left: number; top: number; width: number; height: number } {
  const w = Math.max(1, Math.round(width * widthRatio));
  const h = Math.max(1, Math.round(height * heightRatio));
  const left = Math.round((width - w) / 2);
  const top = vAnchor === "top" ? 0 : Math.round((height - h) / 2);
  return { left, top, width: Math.min(w, width - left), height: Math.min(h, height - top) };
}

type ShotSpec = { widthRatio: number; heightRatio: number; vAnchor: "center" | "top"; zoom: boolean };

/** 항상 이 순서로 만든다 — 첫 컷은 구도 그대로(전체 보정), 나머지는 클로즈업 */
const SHOT_SPECS: ShotSpec[] = [
  { widthRatio: 1, heightRatio: 1, vAnchor: "center", zoom: false },
  { widthRatio: 0.6, heightRatio: 0.6, vAnchor: "center", zoom: true },
  { widthRatio: 0.75, heightRatio: 0.65, vAnchor: "top", zoom: true },
];

/**
 * 실제 사진 한 장에서 컷을 최대 `count`장 만든다.
 *
 * 실패하면(다운로드 실패, 손상된 이미지 등) 빈 배열을 돌려준다 — 지어낼
 * 수 없으니 그냥 없는 것으로 처리한다. 예외를 던져 상세페이지 생성
 * 전체를 막지 않는다.
 */
export async function generateDetailShots(
  sourceUrl: string,
  count = 2,
): Promise<string[]> {
  const src = await fetchImageBuffer(sourceUrl);
  if (!src) return [];

  let meta: { width?: number; height?: number };
  try {
    meta = await sharp(src, { failOn: "none" }).metadata();
  } catch {
    return [];
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 200 || height < 200) return []; // 너무 작으면 잘라도 화질이 안 나온다

  const specs = SHOT_SPECS.slice(0, Math.max(1, count));
  const urls: string[] = [];

  for (const spec of specs) {
    try {
      const rect = computeCropRect(width, height, spec.widthRatio, spec.heightRatio, spec.vAnchor);
      let pipeline = sharp(src, { failOn: "none" });
      if (spec.zoom) pipeline = pipeline.extract(rect);
      const jpeg = await pipeline
        .resize(1400, 1400, { fit: "inside", withoutEnlargement: !spec.zoom })
        .sharpen()
        .normalise()
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();

      const saved = await saveAiImage(jpeg.toString("base64"));
      if ("url" in saved) urls.push(`${absoluteBaseUrl()}${saved.url}`);
    } catch {
      // 이 컷 하나만 건너뛴다 — 나머지 컷은 계속 시도한다
      continue;
    }
  }

  return urls;
}
