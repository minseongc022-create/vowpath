import type { SituationBrief } from "./types";

/**
 * 지역 — 카탈로그 매칭의 1차 키.
 *
 * 사용자는 "강남에서", "홍대 근처", "판교" 처럼 제각각으로 쓴다. 여기서
 * 하나의 regionKey로 눌러 담고, 그 지역에 오프라인 제휴가 없으면 전국
 * 배송(`nationwide`)으로 흘려보낸다.
 */
export type Region = {
  key: string;
  label: string;
  /** 이 지역을 가리키는 말들 — 원문에서 이 중 하나라도 나오면 매칭 */
  aliases: string[];
  /** 오프라인(식당·픽업) 제휴가 있는 지역인가 */
  offline: boolean;
  /** 제휴가 없을 때 대신 볼 이웃 지역 순서 */
  neighbors: string[];
};

export const NATIONWIDE = "nationwide";

export const REGIONS: Region[] = [
  {
    key: "seoul-gangnam",
    label: "서울 강남·서초",
    aliases: ["강남", "신사", "압구정", "가로수길", "청담", "논현", "서초", "교대", "역삼", "선릉", "삼성동"],
    offline: true,
    neighbors: ["seoul-jamsil", "seoul-seongsu", "seoul-yeouido"],
  },
  {
    key: "seoul-hongdae",
    label: "서울 홍대·연남",
    aliases: ["홍대", "연남", "합정", "상수", "망원", "신촌", "이대", "서교동"],
    offline: true,
    neighbors: ["seoul-yeouido", "seoul-jongno", "seoul-seongsu"],
  },
  {
    key: "seoul-seongsu",
    label: "서울 성수·건대",
    aliases: ["성수", "성동", "건대", "뚝섬", "서울숲", "왕십리", "옥수"],
    offline: true,
    neighbors: ["seoul-jongno", "seoul-jamsil", "seoul-gangnam"],
  },
  {
    key: "seoul-jongno",
    label: "서울 종로·을지로",
    aliases: ["종로", "을지로", "광화문", "익선동", "인사동", "명동", "시청", "삼청동", "북촌", "충무로"],
    offline: true,
    neighbors: ["seoul-seongsu", "seoul-yeouido", "seoul-hongdae"],
  },
  {
    key: "seoul-yeouido",
    label: "서울 여의도·용산",
    aliases: ["여의도", "용산", "이태원", "한남", "삼각지", "노량진", "당산", "영등포"],
    offline: true,
    neighbors: ["seoul-jongno", "seoul-hongdae", "seoul-gangnam"],
  },
  {
    key: "seoul-jamsil",
    label: "서울 잠실·송파",
    aliases: ["잠실", "송파", "석촌", "방이", "가락", "문정", "올림픽공원", "롯데월드"],
    offline: true,
    neighbors: ["seoul-gangnam", "seoul-seongsu", "gyeonggi-pangyo"],
  },
  {
    key: "gyeonggi-pangyo",
    label: "경기 분당·판교",
    aliases: ["분당", "판교", "정자", "서현", "수내", "야탑", "성남", "광교", "수원", "용인", "동탄"],
    offline: true,
    neighbors: ["seoul-gangnam", "seoul-jamsil"],
  },
  {
    key: "busan-haeundae",
    label: "부산 해운대·서면",
    aliases: ["부산", "해운대", "서면", "광안리", "센텀", "남포동", "전포"],
    offline: true,
    neighbors: [],
  },
  {
    key: NATIONWIDE,
    label: "전국 배송",
    aliases: [],
    offline: false,
    neighbors: [],
  },
];

const REGION_BY_KEY = new Map(REGIONS.map((r) => [r.key, r]));

export function getRegion(key: string): Region | null {
  return REGION_BY_KEY.get(key) ?? null;
}

export function regionLabel(key: string): string {
  return REGION_BY_KEY.get(key)?.label ?? "전국";
}

/** 오프라인 제휴가 있는 지역만 (사용자에게 고르라고 보여줄 목록) */
export function offlineRegions(): Region[] {
  return REGIONS.filter((r) => r.offline);
}

/**
 * 원문에서 지역을 찾아낸다. 못 찾으면 null — 호출부가 기본값을 정한다.
 * 긴 별칭부터 본다("강남"이 "강남구청역"을 먹지 않게).
 */
export function detectRegion(text: string): Region | null {
  const normalized = text.replace(/\s+/g, "");
  let best: { region: Region; length: number } | null = null;
  for (const region of REGIONS) {
    for (const alias of region.aliases) {
      if (!normalized.includes(alias)) continue;
      if (!best || alias.length > best.length) best = { region, length: alias.length };
    }
  }
  return best?.region ?? null;
}

/**
 * 카탈로그를 훑을 지역 우선순위.
 * 내 지역 → 이웃 지역 → 전국 배송. 이웃까지 가면 화면에 "조금 떨어진 곳"
 * 이라고 밝힌다.
 */
export function regionSearchOrder(key: string): string[] {
  const region = REGION_BY_KEY.get(key);
  if (!region) return [NATIONWIDE];
  return [region.key, ...region.neighbors, NATIONWIDE];
}

export function isNearbyRegion(brief: SituationBrief, itemRegionKey: string): boolean {
  if (itemRegionKey === brief.regionKey) return false;
  if (itemRegionKey === NATIONWIDE) return false;
  return true;
}
