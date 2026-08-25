/**
 * 반품지 자동 매칭 — 사람이 JSON 매핑을 손으로 쓰는 일을 없앤다
 *
 * ★ 왜 필요한가
 *
 * 도매꾹/도매매는 상품마다 공급사가 다르다. 지금까지는 공급처 하나를 새로 물 때마다
 * 사람이 `TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP`에 `"domeme:abc123": 1520171`을
 * 직접 써 넣어야 했다. 하루 5개씩 등록하면 매일 손을 대야 한다는 뜻이고,
 * 그 순간 "완전 자동"이 아니게 된다.
 *
 * 이 모듈은 그 연결을 자동으로 만든다. 공급처 상세에서 읽어낸 **반품 주소**와
 * 토스에 등록된 반품지들의 **주소**를 정규화해서 맞춰본다. 맞으면 그 반품지 ID를
 * 그대로 쓴다 — 사람이 매핑을 쓸 필요가 없다.
 *
 * ★ 왜 이렇게까지 보수적인가
 *
 * 주소를 느슨하게 맞추면 "인천 남동구" 두 공급처가 서로의 반품지를 물어간다.
 * 반품이 남의 창고로 가면 수취 거부 → 미아 → 분쟁 → 페널티다. 그래서
 * **도로명 + 건물번호까지 같아야** 매칭으로 인정한다. 층·호수 같은 상세주소만
 * 다른 건 같은 건물로 보고 통과시키되, 그보다 약한 일치는 전부 불일치로 처리한다.
 * 애매하면 매칭 실패로 두고 상위(반품 물류 두뇌)가 판단하게 넘긴다.
 */

import type { TossReturnLocation } from "./return-location-lookup";

export const RETURN_LOCATION_MATCHER_VERSION = "1.0";

/** 자비스가 만들어 주는 반품지 이름 규칙 — 이 이름으로 등록하면 자동으로 물린다 */
export const JARVIS_LOCATION_PREFIX = "자비스";

export type MatchStrength =
  /** 반품지 이름에 공급처 태그(자비스-domeme-abc123)가 박혀 있다 — 사람이 명시적으로 선언한 것 */
  | "name_tag"
  /** 주소 정규화 결과가 완전히 같다 */
  | "exact_address"
  /** 시/도·시군구·도로명·건물번호가 같다 (층·호수만 다름) */
  | "same_building";

export type ReturnLocationMatch = {
  location: TossReturnLocation;
  strength: MatchStrength;
  /** 사람이 읽는 매칭 근거 */
  reason: string;
};

// ─────────────────────────────────────────────────────────────
// 주소 정규화
// ─────────────────────────────────────────────────────────────

/** 같은 지역을 가리키는 여러 표기를 하나로 모은다 */
const PROVINCE_ALIASES: Array<[RegExp, string]> = [
  [/^서울(특별시|시)?/, "서울"],
  [/^부산(광역시|시)?/, "부산"],
  [/^대구(광역시|시)?/, "대구"],
  [/^인천(광역시|시)?/, "인천"],
  [/^광주(광역시|시)?/, "광주"],
  [/^대전(광역시|시)?/, "대전"],
  [/^울산(광역시|시)?/, "울산"],
  [/^세종(특별자치시|시)?/, "세종"],
  [/^경기(도)?/, "경기"],
  [/^강원(특별자치도|도)?/, "강원"],
  [/^충청북도|^충북/, "충북"],
  [/^충청남도|^충남/, "충남"],
  [/^전라북도|^전북(특별자치도)?/, "전북"],
  [/^전라남도|^전남/, "전남"],
  [/^경상북도|^경북/, "경북"],
  [/^경상남도|^경남/, "경남"],
  [/^제주(특별자치도|도)?/, "제주"],
];

/**
 * 구분자·우편번호·괄호 주석을 걷어내고 시/도 표기를 통일한다.
 * **공백은 남긴다** — 숫자 경계를 잃으면 안 되기 때문이다(아래 buildingKey 참고).
 *
 * "인천광역시 남동구 구월로 123, 4층 (구월동)" → "인천 남동구 구월로 123 4층"
 */
function canonicalSpaced(raw: string): string {
  let s = raw.trim();

  // (우) 12345, (구월동) 같은 괄호 주석과 우편번호를 제거
  s = s.replace(/\([^)]*\)/g, " ").replace(/\b\d{5}\b/g, " ");
  // 대한민국 접두어
  s = s.replace(/^(대한민국|한국|korea)\s*/i, "");
  // 구분자는 공백으로 바꾼다 — 지우면 숫자끼리 붙는다.
  // 단, **숫자 사이 하이픈은 남긴다** — 지번 주소의 "45-6"에서 하이픈은
  // 구분자가 아니라 주소의 일부다. 지우면 45번지와 45-6번지가 같아진다.
  s = s
    .replace(/[,./–—·]+/g, " ")
    .replace(/(?<!\d)\s*-\s*|\s*-\s*(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [re, canonical] of PROVINCE_ALIASES) {
    if (re.test(s)) {
      s = s.replace(re, canonical);
      break;
    }
  }
  return s;
}

/**
 * 비교용 정규 표기 — 공백까지 제거해 표기 차이를 흡수한다.
 *
 * "인천광역시 남동구 구월로 123" → "인천남동구구월로123"
 */
export function normalizeAddress(raw: string): string {
  return canonicalSpaced(raw).replace(/\s+/g, "");
}

/**
 * 건물까지의 핵심 부분을 뽑는다 — 층·호수 같은 상세주소는 버린다.
 *
 * "인천 남동구 구월로 123, 4층" → "인천남동구구월로123"
 *
 * ⚠️ 반드시 **공백이 남아 있는 형태**에서 번호를 뽑는다. 공백을 먼저 지우면
 * "구월로 123, 4층"이 "구월로1234층"이 되어 건물번호가 `1234`로 읽히고,
 * 실제 "구월로 1234"와 같은 건물로 판정된다 — 반품이 엉뚱한 곳으로 가는 사고다.
 */
export function buildingKey(raw: string): string | null {
  const s = canonicalSpaced(raw);
  // 도로명 주소: ...로|길 + 번호(-번호). 번호 뒤에 숫자가 이어지면 안 된다.
  const road = s.match(/^(.*?(?:로|길))\s*(\d+(?:-\d+)?)(?!\d)/);
  if (road) return `${road[1]}${road[2]}`.replace(/\s+/g, "");
  // 지번 주소: ...동|가|리 + 번호(-번호)
  const lot = s.match(/^(.*?(?:동|가|리))\s*(\d+(?:-\d+)?)(?!\d)/);
  if (lot) return `${lot[1]}${lot[2]}`.replace(/\s+/g, "");
  return null;
}

/**
 * 두 주소가 같은 곳인가.
 *
 * 완전 일치가 아니면 **건물까지 같아야** 인정한다. 도로명만 같고 번호가 다르면
 * 다른 건물이므로 불일치다 — 여기를 느슨하게 하면 옆 건물로 반품이 간다.
 */
export function compareAddresses(a: string, b: string): MatchStrength | null {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  if (!na || !nb) return null;
  if (na === nb) return "exact_address";

  const ka = buildingKey(a);
  const kb = buildingKey(b);
  if (ka && kb && ka === kb) return "same_building";
  return null;
}

// ─────────────────────────────────────────────────────────────
// 이름 태그
// ─────────────────────────────────────────────────────────────

/**
 * 이 공급처 전용 반품지에 붙일 이름.
 *
 * 토스 셀러센터에서 반품지를 만들 때 이 이름을 그대로 쓰면, 이후 자비스가
 * 주소를 못 읽어도 이름만으로 자동 연결된다. 주소 매칭이 실패할 때의
 * 안전망이자, 사람이 개입할 때의 유일한 규칙이다.
 */
export function jarvisLocationName(platform: string, sellerId: string): string {
  return `${JARVIS_LOCATION_PREFIX}-${platform}-${sellerId}`;
}

/** 반품지 이름에 이 공급처 태그가 박혀 있는가 (대소문자·구분자 무시) */
function hasNameTag(locationName: string, platform: string, sellerId: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-–—:]/g, "");
  const name = norm(locationName);
  return name.includes(norm(`${platform}${sellerId}`)) || name.includes(norm(sellerId));
}

// ─────────────────────────────────────────────────────────────
// 매칭
// ─────────────────────────────────────────────────────────────

export type MatchInput = {
  /** 토스에 등록된 반품지 전체 */
  locations: TossReturnLocation[];
  /** 공급처 상세에서 읽어낸 반품 주소 */
  supplierAddress?: string;
  supplierPlatform?: string;
  supplierId?: string;
};

/**
 * 이 공급처에 맞는 반품지를 토스 등록 목록에서 찾는다.
 *
 * 우선순위:
 *  1. 이름 태그 — 사람이 "이건 이 공급처 것"이라고 명시한 것이므로 가장 확실하다.
 *  2. 주소 완전 일치
 *  3. 같은 건물 (층·호수만 다름)
 *
 * 하나도 안 걸리면 null. 조용히 아무거나 고르지 않는다 —
 * 틀린 반품지는 없는 반품지보다 나쁘다.
 */
export function matchReturnLocation(input: MatchInput): ReturnLocationMatch | null {
  const { locations, supplierAddress, supplierPlatform, supplierId } = input;
  if (!locations.length) return null;

  // 1) 이름 태그
  if (supplierPlatform && supplierId) {
    const tagged = locations.find((l) => l.name && hasNameTag(l.name, supplierPlatform, supplierId));
    if (tagged) {
      return {
        location: tagged,
        strength: "name_tag",
        reason: `반품지 「${tagged.name}」 이름에 공급처 ${supplierPlatform}:${supplierId} 태그가 있어 연결했습니다.`,
      };
    }
  }

  if (!supplierAddress?.trim()) return null;

  // 2) 주소 일치 — 완전 일치를 먼저 훑고, 없으면 같은 건물
  const scored: ReturnLocationMatch[] = [];
  for (const loc of locations) {
    if (!loc.address?.trim()) continue;
    const strength = compareAddresses(supplierAddress, loc.address);
    if (!strength) continue;
    scored.push({
      location: loc,
      strength,
      reason:
        strength === "exact_address"
          ? `공급처 반품 주소가 반품지 「${loc.name}」(${loc.address})와 일치합니다.`
          : `공급처 반품 주소가 반품지 「${loc.name}」(${loc.address})와 같은 건물입니다 (상세주소만 다름).`,
    });
  }

  if (!scored.length) return null;
  return scored.find((m) => m.strength === "exact_address") ?? scored[0];
}

/**
 * 이 주소가 이미 토스에 등록돼 있는가 — 중복 등록을 막기 위한 조회.
 * 프로비저닝 큐에서 "이건 이미 있으니 만들 필요 없다"를 판정할 때 쓴다.
 */
export function findLocationByAddress(
  locations: TossReturnLocation[],
  address: string,
): TossReturnLocation | null {
  for (const loc of locations) {
    if (!loc.address?.trim()) continue;
    if (compareAddresses(address, loc.address)) return loc;
  }
  return null;
}
