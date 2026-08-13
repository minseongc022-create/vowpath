import { TopikStoreProvider } from "@/topik/components/providers/TopikStoreProvider";

/** Must stay dynamic so middleware `x-app-shell: topik` picks TopikPlatformShell (not Effiroad). */
export const dynamic = "force-dynamic";

export default function TopikRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TopikStoreProvider>{children}</TopikStoreProvider>;
}
