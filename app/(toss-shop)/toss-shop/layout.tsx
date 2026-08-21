import { TossShopShell } from "@/toss-shop/components/TossShopShell";

export default function TossShopLayout({ children }: { children: React.ReactNode }) {
  return <TossShopShell>{children}</TossShopShell>;
}
