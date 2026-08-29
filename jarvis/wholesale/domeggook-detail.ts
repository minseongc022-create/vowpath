/**
 * 상세 조회(getItemView) — 이미지·반품주소·이미지 사용 허가를 읽는다
 *
 * ★ 왜 필요했나
 *
 * 상세페이지가 사진 한 장뿐이라는 지적을 받았다. 원인은 간단했다 —
 * confirmSingleUnitSourcing이 getItemView를 이미 부르고 있었는데,
 * 그 응답에서 **가격·구매단위만** 읽고 나머지는 전부 버리고 있었다.
 * `WholesaleListing.detailImageUrls`·`supplierReturnAddress` 필드는
 * 처음부터 있었지만 채우는 코드가 아예 없었다.
 *
 * ★ 실제 응답으로 확인했다
 *
 * 추측으로 필드명을 짚으면 이 프로젝트에서 이미 두 번(MOQ, 검색 응답
 * 문자열/숫자) 조용히 다 걸러지는 사고가 났다. 그래서 실제 상품
 * (모디스 보조배터리, no=9502515)의 getItemView 응답을 한 번 떠서
 * 확인했다:
 *
 *     desc.license = {"usable":"true","msg":"상품설명에 사용된 이미지를
 *                      다른 곳에서 사용하는 것을 허용합니다."}
 *     desc.contents.item = "<p>...<img src='...'>...</p>"  (실제 상품 사진)
 *     return.addr = {"zipcode":"21990","address1":"...","address2":"...",
 *                     "phone":"...","mobile":"..."}
 *
 * 셋 다 **구조화된 필드**로 왔다 — 반품주소는 정규식으로 문단에서 뽑아낼
 * 필요조차 없었다. 이미지 사용 허가도 자유 텍스트가 아니라 boolean에
 * 가까운 값(`usable`)과 사람이 읽는 문구(`msg`)가 따로 있다.
 *
 * ★ 사진은 두 군데서 온다
 *
 *   1. thumb.large/original — 검색에서 보이는 대표 이미지 그 자체(같은
 *      사진의 더 큰 해상도일 뿐, 새 사진이 아니다). 라이선스와 무관하게
 *      쓴다 — 도매꾹이 검색·비교에 쓰라고 준 대표 이미지다.
 *   2. desc.contents.item에 박힌 <img> — 공급처가 상세설명에 넣은 **진짜
 *      추가 사진들**. license.usable이 true일 때만 쓴다 — 이 필드가
 *      정확히 "이 사진들을 다른 곳(=우리 상세페이지)에서 써도 되는가"를
 *      말해주기 때문이다. false거나 모르면 안 쓴다 — 허락 없이 남의
 *      상품 사진을 가져다 쓰면 저작권 문제가 된다.
 *
 * desc.notice(배송 안내 배너 GIF 같은 것)는 상품 사진이 아니므로 빼고,
 * contents.item의 사진만 "상품 사진"으로 본다.
 */

export const DOMEGGOOK_DETAIL_VERSION = "1.0";

export type ImageLicense = {
  /** 상세설명에 쓰인 이미지를 우리 상세페이지에서 써도 되는가 */
  usable: boolean;
  /** 공급처가 밝힌 원문 — 검수 화면에 그대로 보여줄 수 있게 */
  message?: string;
};

export type ItemDetailExtras = {
  /** 검색 대표 이미지의 큰 해상도 버전 (라이선스 무관, 늘 있으면 씀) */
  primaryImageUrl?: string;
  /** 라이선스가 확인된 경우에만 채워지는 상세설명 속 실제 상품 사진들 */
  licensedImageUrls: string[];
  license: ImageLicense | null;
  /** 공급처 반품 주소 (완성된 한 줄) */
  returnAddress?: string;
  /** 원산지 (detail.country) — 있으면 상품정보 표에 넣는다 */
  originCountry?: string;
};

const MAX_SEARCH_DEPTH = 8;

/** 키 이름으로 찾아 들어간다 — 검색 응답 파서와 같은 이유다(껍질이 바뀌어도 버틴다) */
function findByPath(node: unknown, path: string[], depth = 0): unknown {
  if (depth > MAX_SEARCH_DEPTH || !node || typeof node !== "object") return undefined;
  const obj = node as Record<string, unknown>;
  if (path.length === 0) return obj;

  const [head, ...rest] = path;
  if (head in obj) {
    const next = rest.length === 0 ? obj[head] : findByPath(obj[head], rest, depth + 1);
    if (next !== undefined) return next;
  }
  // 바로 안 보이면 한 겹씩 벗겨서 같은 경로를 다시 찾는다
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const hit = findByPath(value, path, depth + 1);
      if (hit !== undefined) return hit;
    }
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

/** desc.license — "usable"이 문자열("true"/"false")로 오므로 그대로 boolean화한다 */
function readImageLicense(data: unknown): ImageLicense | null {
  const license = findByPath(data, ["desc", "license"]);
  if (!license || typeof license !== "object") return null;
  const l = license as Record<string, unknown>;
  const usableRaw = l.usable;
  const usable =
    usableRaw === true || usableRaw === "true" || usableRaw === "Y" || usableRaw === "y";
  const notUsable =
    usableRaw === false || usableRaw === "false" || usableRaw === "N" || usableRaw === "n";
  if (!usable && !notUsable) return null; // 값을 못 읽으면 모른다 — 허용으로 단정하지 않는다
  return { usable, message: str(l.msg) };
}

/** desc.contents.item(HTML) 안의 <img src="..."> 를 뽑는다 — 렌더링은 하지 않는다 */
function extractImgSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]+src\s*=\s*['"]([^'"]+)['"]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = m[1].trim();
    if (src && /^https?:\/\//i.test(src)) out.push(src);
  }
  return out;
}

/** return.addr — 이미 완성된 필드들이라 조립만 한다 */
function readReturnAddress(data: unknown): string | undefined {
  const addr = findByPath(data, ["return", "addr"]);
  if (!addr || typeof addr !== "object") return undefined;
  const a = addr as Record<string, unknown>;
  const zipcode = str(a.zipcode);
  const address1 = str(a.address1);
  const address2 = str(a.address2);
  if (!address1) return undefined;
  const parts = [zipcode, address1, address2].filter(Boolean);
  return parts.join(" ");
}

/** detail.country — "수입산_아시아_중국"처럼 밑줄로 이어 온다. 사람이 읽게 구분자만 바꾼다 */
function readOriginCountry(data: unknown): string | undefined {
  const raw = findByPath(data, ["detail", "country"]);
  const s = str(raw);
  if (!s) return undefined;
  return s.replace(/_/g, " / ");
}

function readPrimaryImageUrl(data: unknown): string | undefined {
  const thumb = findByPath(data, ["thumb"]);
  if (!thumb || typeof thumb !== "object") return undefined;
  const t = thumb as Record<string, unknown>;
  return str(t.large) ?? str(t.original) ?? str(t.small);
}

/**
 * getItemView 원본 응답에서 상세페이지에 쓸 것들을 뽑는다.
 *
 * license.usable이 true일 때만 contents.item의 사진을 채운다 — 그 외에는
 * 빈 배열이다(대표 이미지 하나는 라이선스와 무관하게 그대로 나간다).
 */
export function readItemDetailExtras(data: unknown): ItemDetailExtras {
  const license = readImageLicense(data);
  const primaryImageUrl = readPrimaryImageUrl(data);

  let licensedImageUrls: string[] = [];
  if (license?.usable) {
    const html = str(findByPath(data, ["desc", "contents", "item"]));
    if (html) {
      // 대표 이미지와 중복되는 것은 뺀다 — 같은 사진이 두 번 나오면 안 된다
      licensedImageUrls = extractImgSrcs(html).filter((u) => u !== primaryImageUrl);
    }
  }

  return {
    primaryImageUrl,
    licensedImageUrls,
    license,
    returnAddress: readReturnAddress(data),
    originCountry: readOriginCountry(data),
  };
}
