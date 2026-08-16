import type { GiuCategory, GiuDistrict } from "./types";

export const DISTRICT_LABELS_KO: Record<GiuDistrict, string> = {
  quan_1: "1군",
  quan_3: "3군",
  quan_5: "5군",
  quan_7: "7군",
  quan_10: "10군",
  binh_thanh: "빈탄",
  phu_nhuan: "푸뉴안",
  icn_jung: "중구 (동인천)",
  icn_dong: "동구",
  icn_michuhol: "미추홀구 (주안)",
  icn_yeonsu: "연수구 (송도)",
  icn_namdong: "남동구 (구월)",
  icn_bupyeong: "부평구",
  icn_gyeyang: "계양구",
  icn_seo: "서구 (청라·검단)",
};

export const CATEGORY_LABELS_KO: Record<GiuCategory, string> = {
  banh_mi: "빵·샌드위치",
  bakery: "베이커리",
  cafe: "카페·디저트",
  tra_sua: "음료",
  nha_hang: "식당",
  tap_hoa: "편의점",
  hoa: "꽃",
  khac: "기타",
};

export function districtLabel(id: GiuDistrict, _locale?: "ko"): string {
  return DISTRICT_LABELS_KO[id] ?? id;
}

export function categoryLabel(id: GiuCategory, _locale?: "ko"): string {
  return CATEGORY_LABELS_KO[id] ?? id;
}
