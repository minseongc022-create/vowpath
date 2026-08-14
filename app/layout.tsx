import type { Metadata, Viewport } from "next";
import { PlatformShell } from "@/components/layout/PlatformShell";
import { LearnPlatformShell } from "@/learn/components/layout/LearnPlatformShell";
import { TopikPlatformShell } from "@/topik/components/layout/TopikPlatformShell";
import { ManoPlatformShell } from "@/mano/components/layout/ManoPlatformShell";
import { MANO_BRAND } from "@/mano/lib/brand";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { marketingUiLocale, resolveServerUiLocale } from "@/lib/locale";
import { getAppShell } from "@/lib/shell-route";
import { LEARN_BRAND } from "@/learn/lib/brand";
import { TOPIK_BRAND } from "@/topik/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const shell = await getAppShell();
  if (shell === "learn") {
    return {
      title: { default: LEARN_BRAND.name, template: `%s · ${LEARN_BRAND.name}` },
      description: LEARN_BRAND.tagline,
      robots: { index: false, follow: false },
    };
  }
  if (shell === "topik") {
    return {
      title: { default: TOPIK_BRAND.name, template: `%s · ${TOPIK_BRAND.name}` },
      description: TOPIK_BRAND.tagline,
      applicationName: TOPIK_BRAND.name,
      robots: { index: true, follow: true },
      openGraph: {
        title: TOPIK_BRAND.name,
        description: TOPIK_BRAND.tagline,
        locale: "vi_VN",
      },
    };
  }
  if (shell === "mano") {
    return {
      title: { default: MANO_BRAND.name, template: `%s · ${MANO_BRAND.name}` },
      description: MANO_BRAND.tagline,
      applicationName: MANO_BRAND.name,
      robots: { index: true, follow: true },
      openGraph: {
        title: MANO_BRAND.name,
        description: MANO_BRAND.tagline,
        locale: "es_MX",
      },
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
  const shell = await getAppShell();
  if (shell === "learn") {
    return <LearnPlatformShell>{children}</LearnPlatformShell>;
  }
  if (shell === "topik") {
    return <TopikPlatformShell>{children}</TopikPlatformShell>;
  }
  if (shell === "mano") {
    return <ManoPlatformShell>{children}</ManoPlatformShell>;
  }
  return <PlatformShell>{children}</PlatformShell>;
}
