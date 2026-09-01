import type { Metadata, Viewport } from "next";
import { PlatformShell } from "@/components/layout/PlatformShell";
import { LearnPlatformShell } from "@/learn/components/layout/LearnPlatformShell";
import { TopikPlatformShell } from "@/topik/components/layout/TopikPlatformShell";
import { ManoPlatformShell } from "@/mano/components/layout/ManoPlatformShell";
import { GiuPlatformShell } from "@/giu/components/layout/GiuPlatformShell";
import { JarvisPlatformShell } from "@/jarvis/ui/JarvisPlatformShell";
import { DajeongPlatformShell } from "@/dajeong/components/DajeongPlatformShell";
import { EFFIROAD_BRAND } from "@/jarvis/brand";
import { MANO_BRAND } from "@/mano/lib/brand";
import { GIU_BRAND } from "@/giu/lib/brand";
import { resolveGiuPublicOrigin } from "@/giu/lib/giu-host-server";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { marketingUiLocale, resolveServerUiLocale } from "@/lib/locale";
import { getAppShell } from "@/lib/shell-route";
import { LEARN_BRAND } from "@/learn/lib/brand";
import { TOPIK_BRAND } from "@/topik/lib/brand";
import { DAJEONG_BRAND } from "@/dajeong/lib/brand";

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
  if (shell === "jarvis") {
    return {
      title: { default: EFFIROAD_BRAND.nameKo, template: `%s · ${EFFIROAD_BRAND.nameKo}` },
      description: EFFIROAD_BRAND.tagline,
      applicationName: EFFIROAD_BRAND.name,
      robots: { index: true, follow: true },
      openGraph: {
        title: EFFIROAD_BRAND.fullName,
        description: EFFIROAD_BRAND.tagline,
        locale: "ko_KR",
      },
    };
  }
  if (shell === "giu") {
    const origin = await resolveGiuPublicOrigin();
    return {
      // No metadataBase — setting apex URL while users visit www breaks /_next/static CSS.
      title: { default: GIU_BRAND.fullName, template: `%s · ${GIU_BRAND.name}` },
      description: GIU_BRAND.tagline,
      applicationName: GIU_BRAND.name,
      manifest: "/giu/site.webmanifest",
      robots: { index: true, follow: true },
      openGraph: {
        title: GIU_BRAND.fullName,
        description: GIU_BRAND.tagline,
        locale: "ko_KR",
        url: origin,
      },
    };
  }
  if (shell === "dajeong") {
    return {
      title: { default: DAJEONG_BRAND.fullName, template: `%s · ${DAJEONG_BRAND.name}` },
      description: DAJEONG_BRAND.tagline,
      applicationName: DAJEONG_BRAND.name,
      robots: { index: false, follow: false },
      openGraph: {
        title: DAJEONG_BRAND.fullName,
        description: DAJEONG_BRAND.tagline,
        locale: "ko_KR",
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
  if (shell === "giu") {
    return <GiuPlatformShell>{children}</GiuPlatformShell>;
  }
  if (shell === "jarvis") {
    return <JarvisPlatformShell>{children}</JarvisPlatformShell>;
  }
  if (shell === "dajeong") {
    return <DajeongPlatformShell>{children}</DajeongPlatformShell>;
  }
  return <PlatformShell>{children}</PlatformShell>;
}
