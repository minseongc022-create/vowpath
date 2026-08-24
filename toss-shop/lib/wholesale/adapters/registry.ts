/**
 * 도매처 어댑터 레지스트리 — 소싱처를 늘리는 표준 통로
 *
 * ★ 소싱처를 늘리는 진짜 이유는 "더 싼 곳"이 아니다.
 * 토스쇼핑은 카탈로그 대표 아이템 구조라, 남들과 똑같은 도매 상품을 그대로
 * 올리면 최저가 싸움에서 지는 순간 죽는다 (toss-policy-engine 참조).
 * 소싱처를 늘리는 실익은 셋이다:
 *   1) 중복도 낮추기 — 도매꾹에만 있는 셀러는 도매꾹 상품만 올린다
 *   2) 품절 시 대체 공급처 — 효자 SKU가 품절되면 인센티브·순위가 같이 무너진다
 *   3) 같은 상품 교차검증 — 최저 원가를 실제로 알 수 있다
 *
 * ★ fail-closed 원칙:
 * 미설정(키 없음) 또는 스펙 미검증 어댑터는 **검색 결과를 내지 않는다.**
 * 추정 데이터를 만들어 채우지 않는다 — 그건 import-sources.ts가 저지른
 * "해시로 원가 생성" 실수와 같은 종류이고, 그 위에 마진·수익이 쌓이면
 * 셀러가 가짜 숫자를 근거로 실제 돈을 쓰게 된다.
 *
 * ⚠️ 플랫폼별 필드맵이 필수다.
 * supplier-quality의 기본 필드 후보는 도매꾹 응답 기준이다. 다른 플랫폼에
 * 그대로 쓰면 전부 판독 실패 → verified:false → 전량 탈락한다. 안전하긴 하나
 * 그 플랫폼 상품이 하나도 안 올라간다. 어댑터는 자기 필드맵을 반드시 준다.
 */

import type { WholesaleListing, WholesalePlatform } from "../types";
import type { SupplierQualityFieldMap } from "../supplier-quality";
import { DOMEGGOOK_QUALITY_FIELDS } from "../supplier-quality";
import { isDomeggookApiConfigured, searchDomeggookMarket } from "../domeggook-api";

export const ADAPTER_REGISTRY_VERSION = "1.0";

/** 어댑터가 실제로 쓸 수 있는 상태인가 */
export type AdapterStatus =
  /** 키가 있고 스펙이 검증됨 — 실소싱에 쓴다 */
  | "live"
  /** 스펙은 구현됐으나 API 키가 없다 */
  | "needs_key"
  /**
   * 플랫폼이 오픈API를 제공하는 것은 확인했으나, 이 저장소에 엔드포인트·인증·
   * 응답 필드 스펙이 아직 반영되지 않았다. 추측으로 채우지 않는다.
   */
  | "needs_spec";

export type WholesaleAdapter = {
  platform: WholesalePlatform | string;
  label: string;
  /** 공급처 단위 반품지 매핑에 쓰이는 키 접두사 (exchange-return-location) */
  returnLocationKeyPrefix: string;
  /** 이 플랫폼 응답에서 등급·출고를 어디서 읽는가 */
  qualityFields: SupplierQualityFieldMap;
  status(): AdapterStatus;
  /** 필요한 환경변수 이름 — 설정 화면·헬스체크에 노출 */
  envKeys: string[];
  /** live일 때만 호출된다. 미설정이면 호출하지 않는다. */
  search?(keyword: string, limit: number): Promise<WholesaleListing[]>;
  /** 스펙 확보에 필요한 것 — needs_spec일 때 사람이 읽는 안내 */
  specNote?: string;
};

// ─────────────────────────────────────────────────────────────
// 도매꾹 / 도매매 — 유일하게 실연동된 어댑터
// ─────────────────────────────────────────────────────────────

const domeggookAdapter: WholesaleAdapter = {
  platform: "domeggook",
  label: "도매꾹·도매매",
  returnLocationKeyPrefix: "domeggook",
  qualityFields: DOMEGGOOK_QUALITY_FIELDS,
  envKeys: ["DOMEGGOOK_API_KEY"],
  status: () => (isDomeggookApiConfigured() ? "live" : "needs_key"),
  async search(keyword, limit) {
    // 도매꾹(dome)과 도매매(supply)는 같은 API의 다른 마켓이다. 둘 다 훑어야
    // 같은 상품의 최저 원가를 실제로 알 수 있다.
    const [dome, supply] = await Promise.all([
      searchDomeggookMarket(keyword, "dome", limit),
      searchDomeggookMarket(keyword, "supply", limit),
    ]);
    return [...dome, ...supply].filter((l) => l.source === "live");
  },
};

// ─────────────────────────────────────────────────────────────
// 스펙 미확보 어댑터
//
// 아래 플랫폼들은 오픈API 페이지를 운영하는 것이 확인됐지만, 엔드포인트·인증
// 방식·응답 필드명을 이 저장소에서 검증하지 못했다. 검증 전까지 status는
// needs_spec이고 search가 없으므로 **검색에 절대 참여하지 않는다.**
//
// 활성화 절차(플랫폼당 30분 수준):
//   1) 제휴 신청 → API 키 발급
//   2) 실제 응답 1건을 확보해 qualityFields(등급·출고속도·출고율 필드명) 확정
//   3) search() 구현 + envKeys 설정 → status가 live로 전환
// 2번이 핵심이다. 등급·출고 필드를 못 읽으면 meetsSupplierPolicy가 전량
// 탈락시켜서, 연동해도 상품이 하나도 안 올라간다.
// ─────────────────────────────────────────────────────────────

function pendingAdapter(cfg: {
  platform: string;
  label: string;
  envKeys: string[];
  specNote: string;
}): WholesaleAdapter {
  return {
    platform: cfg.platform,
    label: cfg.label,
    returnLocationKeyPrefix: cfg.platform,
    // 도매꾹 필드맵을 잠정 사용 — 실응답 확보 시 반드시 교체해야 한다.
    qualityFields: DOMEGGOOK_QUALITY_FIELDS,
    envKeys: cfg.envKeys,
    status: () => "needs_spec",
    specNote: cfg.specNote,
  };
}

const pendingAdapters: WholesaleAdapter[] = [
  pendingAdapter({
    platform: "ownerclan",
    label: "오너클랜",
    envKeys: ["OWNERCLAN_API_KEY"],
    specNote:
      "위탁 전문·상품수 최대급. 오픈API 제공 확인. 인증 방식·상품검색 엔드포인트·" +
      "공급사 등급/출고 필드명 확보 필요.",
  }),
  pendingAdapter({
    platform: "onch",
    label: "온채널",
    envKeys: ["ONCH_API_KEY"],
    specNote:
      "위탁 전문, 제조사 직배송 비중 높음. API 가이드 페이지 운영 확인. " +
      "상품조회·발주 엔드포인트와 출고 관련 필드명 확보 필요.",
  }),
  pendingAdapter({
    platform: "zentrade",
    label: "젠트레이드",
    envKeys: ["ZENTRADE_API_KEY"],
    specNote:
      "오픈마켓 연동 전제로 설계된 B2B 도매. open_api 페이지 운영 확인. " +
      "인증·응답 포맷 확보 필요.",
  }),
  pendingAdapter({
    platform: "dometopia",
    label: "도매토피아",
    envKeys: ["DOMETOPIA_API_KEY"],
    specNote: "생활/잡화 강세, 자체 물류로 출고 안정성 예측 가능. API 제공 여부 확인 필요.",
  }),
];

const ADAPTERS: WholesaleAdapter[] = [domeggookAdapter, ...pendingAdapters];

export function listAdapters(): WholesaleAdapter[] {
  return ADAPTERS;
}

export function getAdapter(platform: string): WholesaleAdapter | undefined {
  return ADAPTERS.find((a) => a.platform === platform);
}

/** 실제로 소싱에 쓸 수 있는 어댑터만 */
export function liveAdapters(): WholesaleAdapter[] {
  return ADAPTERS.filter((a) => a.status() === "live");
}

export type AdapterHealth = {
  platform: string;
  label: string;
  status: AdapterStatus;
  envKeys: string[];
  detail: string;
};

export function adapterHealth(): AdapterHealth[] {
  return ADAPTERS.map((a) => {
    const status = a.status();
    return {
      platform: String(a.platform),
      label: a.label,
      status,
      envKeys: a.envKeys,
      detail:
        status === "live"
          ? "연동됨 — 실시간 소싱 참여"
          : status === "needs_key"
            ? `${a.envKeys.join(", ")} 미설정 — 소싱 미참여`
            : (a.specNote ?? "API 스펙 미확보 — 소싱 미참여"),
    };
  });
}

/**
 * 여러 도매처에서 동시에 검색해 합친다.
 *
 * 같은 상품이 여러 플랫폼에 있으면 **최저 원가를 실제로 알 수 있고**,
 * 한 곳이 품절이어도 대체 공급처가 남는다. 이게 다중 연동의 실익이다.
 * live가 아닌 어댑터는 아예 호출하지 않으므로 추정 데이터가 섞이지 않는다.
 */
export async function searchAllWholesale(
  keyword: string,
  limitPerPlatform = 10,
): Promise<{ listings: WholesaleListing[]; searched: string[]; skipped: AdapterHealth[] }> {
  const live = liveAdapters();
  const skipped = adapterHealth().filter((h) => h.status !== "live");

  const results = await Promise.all(
    live.map(async (a) => {
      try {
        return (await a.search?.(keyword, limitPerPlatform)) ?? [];
      } catch {
        // 한 플랫폼이 죽어도 나머지 소싱은 계속되어야 한다
        return [];
      }
    }),
  );

  return {
    listings: results.flat(),
    searched: live.map((a) => String(a.platform)),
    skipped,
  };
}
