import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PlatformShell } from "@/components/layout/PlatformShell";
import { LearnPlatformShell } from "@/learn/components/layout/LearnPlatformShell";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { marketingUiLocale, resolveServerUiLocale } from "@/lib/locale";
import { LEARN_BRAND } from "@/learn/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  if (h.get("x-app-shell") === "learn") {
    return {
      title: { default: LEARN_BRAND.name, template: `%s · ${LEARN_BRAND.name}` },
      description: LEARN_BRAND.tagline,
      robots: { index: false, follow: false },
    };
  }
  const locale = await resolveServerUiLocale();
  return buildSiteMetadata(marketingUiLocale(locale) === "es" ? "es" : "en");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f5",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  if (h.get("x-app-shell") === "learn") {
    return <LearnPlatformShell>{children}</LearnPlatformShell>;
  }
  return <PlatformShell>{children}</PlatformShell>;
}
