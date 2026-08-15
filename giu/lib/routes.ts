export const GIU_ROUTES = {
  auth: "/giu/dang-ky",
  customer: {
    home: "/giu/hop",
    boxes: "/giu/hop",
    favorites: "/giu/yeu-thich",
    my: "/giu/ma-cua-toi",
    box: (id: string) => `/giu/hop/${id}`,
    reservation: (id: string) => `/giu/dat/${id}`,
  },
  merchant: {
    home: "/giu/cua-hang/panel",
    panel: "/giu/cua-hang/panel",
  },
} as const;

export type GiuAppRole = "customer" | "merchant";

export function isGiuAuthPath(pathname: string): boolean {
  return (
    pathname === GIU_ROUTES.auth ||
    pathname.startsWith(`${GIU_ROUTES.auth}/`) ||
    pathname === "/giu/auth" ||
    pathname.startsWith("/giu/auth/") ||
    pathname === "/giu/dang-nhap" ||
    pathname === "/giu/dang-ky"
  );
}

export function isGiuMerchantPath(pathname: string): boolean {
  return pathname.startsWith("/giu/cua-hang");
}

export function homePathForRole(role: GiuAppRole): string {
  return role === "merchant" ? GIU_ROUTES.merchant.home : GIU_ROUTES.customer.home;
}
