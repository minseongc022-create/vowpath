import { KR_MERCHANT_DISTRICTS, VN_DISTRICTS } from "./market";
import type { GiuDistrict, GiuMarket } from "./types";

export const GIu_DISTRICTS: {
  id: GiuDistrict;
  label: string;
  labelEn: string;
  market: GiuMarket;
}[] = [
  { id: "quan_1", label: "1군", labelEn: "District 1", market: "vn" },
  { id: "quan_3", label: "3군", labelEn: "District 3", market: "vn" },
  { id: "quan_5", label: "5군", labelEn: "District 5", market: "vn" },
  { id: "quan_7", label: "7군", labelEn: "District 7", market: "vn" },
  { id: "quan_10", label: "10군", labelEn: "District 10", market: "vn" },
  { id: "binh_thanh", label: "빈탄", labelEn: "Binh Thanh", market: "vn" },
  { id: "phu_nhuan", label: "푸뉴안", labelEn: "Phu Nhuan", market: "vn" },
  { id: "icn_yeonsu", label: "연수구 (송도)", labelEn: "Yeonsu", market: "kr" },
  { id: "icn_namdong", label: "남동구 (구월)", labelEn: "Namdong", market: "kr" },
  { id: "icn_bupyeong", label: "부평구", labelEn: "Bupyeong", market: "kr" },
  { id: "icn_michuhol", label: "미추홀구 (주안)", labelEn: "Michuhol", market: "kr" },
  { id: "icn_seo", label: "서구 (청라·검단)", labelEn: "Seo", market: "kr" },
  { id: "icn_gyeyang", label: "계양구", labelEn: "Gyeyang", market: "kr" },
  { id: "icn_jung", label: "중구 (동인천)", labelEn: "Jung", market: "kr" },
  { id: "icn_dong", label: "동구", labelEn: "Dong", market: "kr" },
];

export function districtsForMarket(market: GiuMarket) {
  return GIu_DISTRICTS.filter((d) => d.market === market);
}

/** Customer map — Incheon KR districts. */
export function customerDistricts() {
  return districtsForMarket("kr");
}

/** Merchant signup / panel — Incheon KR. */
export function merchantDistricts() {
  return districtsForMarket("kr");
}

export function getDistrictLabel(id: GiuDistrict): string {
  return GIu_DISTRICTS.find((d) => d.id === id)?.label ?? id;
}

export function isGiuDistrict(value: string): value is GiuDistrict {
  return GIu_DISTRICTS.some((d) => d.id === value);
}

export function isVnDistrict(id: GiuDistrict): boolean {
  return (VN_DISTRICTS as string[]).includes(id);
}

export function isKrDistrict(id: GiuDistrict): boolean {
  return (KR_MERCHANT_DISTRICTS as string[]).includes(id);
}
