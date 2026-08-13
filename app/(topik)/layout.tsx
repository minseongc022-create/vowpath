import { TopikStoreProvider } from "@/topik/components/providers/TopikStoreProvider";

export default function TopikRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TopikStoreProvider>{children}</TopikStoreProvider>;
}
