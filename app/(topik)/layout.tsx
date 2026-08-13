import type { Metadata, Viewport } from "next";
import "@/learn/styles/learn.css";
import "@/topik/styles/topik.css";
import { LearnAuthProvider } from "@/learn/components/providers/LearnAuthProvider";
import { TOPIK_BRAND } from "@/topik/lib/brand";

export const metadata: Metadata = {
  title: {
    default: TOPIK_BRAND.name,
    template: `%s · ${TOPIK_BRAND.name}`,
  },
  description: TOPIK_BRAND.tagline,
  applicationName: TOPIK_BRAND.name,
  openGraph: {
    title: TOPIK_BRAND.name,
    description: TOPIK_BRAND.tagline,
    locale: "vi_VN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c94c55",
};

export default function TopikRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="learn-theme topik-theme min-h-dvh">
      <LearnAuthProvider>{children}</LearnAuthProvider>
    </div>
  );
}
