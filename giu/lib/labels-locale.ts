import type { GiuCategory, GiuDistrict } from "./types";

export const DISTRICT_LABELS_VI: Record<GiuDistrict, string> = {
  quan_1: "Quận 1",
  quan_3: "Quận 3",
  quan_5: "Quận 5",
  quan_7: "Quận 7",
  quan_10: "Quận 10",
  binh_thanh: "Bình Thạnh",
  phu_nhuan: "Phú Nhuận",
  icn_jung: "Jung-gu (Incheon)",
  icn_dong: "Dong-gu (Incheon)",
  icn_michuhol: "Michuhol-gu",
  icn_yeonsu: "Yeonsu-gu",
  icn_namdong: "Namdong-gu",
  icn_bupyeong: "Bupyeong-gu",
  icn_gyeyang: "Gyeyang-gu",
  icn_seo: "Seo-gu",
};

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

export const CATEGORY_LABELS_VI: Record<GiuCategory, string> = {
  banh_mi: "Bánh mì",
  bakery: "Tiệm bánh",
  cafe: "Cà phê",
  tra_sua: "Trà sữa",
  nha_hang: "Nhà hàng",
  tap_hoa: "Tạp hóa",
  hoa: "Hoa",
  khac: "Khác",
};

export const CATEGORY_LABELS_KO: Record<GiuCategory, string> = {
  banh_mi: "반미",
  bakery: "베이커리",
  cafe: "카페·디저트",
  tra_sua: "버블티",
  nha_hang: "식당",
  tap_hoa: "편의점",
  hoa: "꽃",
  khac: "기타",
};

export function districtLabel(id: GiuDistrict, locale: "ko" | "vi"): string {
  return locale === "vi" ? DISTRICT_LABELS_VI[id] : DISTRICT_LABELS_KO[id];
}

export function categoryLabel(id: GiuCategory, locale: "ko" | "vi"): string {
  return locale === "vi" ? CATEGORY_LABELS_VI[id] : CATEGORY_LABELS_KO[id];
}
