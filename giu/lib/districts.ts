import type { GiuDistrict } from "./types";

export const GIu_DISTRICTS: {
  id: GiuDistrict;
  label: string;
  labelEn: string;
}[] = [
  { id: "quan_1", label: "1군", labelEn: "District 1" },
  { id: "quan_3", label: "3군", labelEn: "District 3" },
  { id: "quan_5", label: "5군", labelEn: "District 5" },
  { id: "quan_7", label: "7군", labelEn: "District 7" },
  { id: "quan_10", label: "10군", labelEn: "District 10" },
  { id: "binh_thanh", label: "빈탄", labelEn: "Binh Thanh" },
  { id: "phu_nhuan", label: "푸뉴안", labelEn: "Phu Nhuan" },
];

export function getDistrictLabel(id: GiuDistrict): string {
  return GIu_DISTRICTS.find((d) => d.id === id)?.label ?? id;
}

export function isGiuDistrict(value: string): value is GiuDistrict {
  return GIu_DISTRICTS.some((d) => d.id === value);
}
