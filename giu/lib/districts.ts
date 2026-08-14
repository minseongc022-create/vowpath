import type { GiuDistrict } from "./types";

export const GIu_DISTRICTS: {
  id: GiuDistrict;
  label: string;
  labelEn: string;
}[] = [
  { id: "quan_1", label: "Quận 1", labelEn: "District 1" },
  { id: "quan_3", label: "Quận 3", labelEn: "District 3" },
  { id: "quan_5", label: "Quận 5", labelEn: "District 5" },
  { id: "quan_7", label: "Quận 7", labelEn: "District 7" },
  { id: "quan_10", label: "Quận 10", labelEn: "District 10" },
  { id: "binh_thanh", label: "Bình Thạnh", labelEn: "Binh Thanh" },
  { id: "phu_nhuan", label: "Phú Nhuận", labelEn: "Phu Nhuan" },
];

export function getDistrictLabel(id: GiuDistrict): string {
  return GIu_DISTRICTS.find((d) => d.id === id)?.label ?? id;
}

export function isGiuDistrict(value: string): value is GiuDistrict {
  return GIu_DISTRICTS.some((d) => d.id === value);
}
