import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

/** Cache-bust favicons after asset updates */
export const SITE_ICON_VERSION = "15";

export const SITE_SEO = {
  title: "Effiroad | AI Emergency Intake & Dispatch for Restoration Companies",
  description:
    "Effiroad helps water, fire, and mold restoration companies answer every emergency call, capture insurance-ready intake, dispatch crews, and never lose a claim to voicemail. 24/7 AI phone, SMS, dispatch, and analytics in one platform.",
  ogTitle: "Effiroad | Never Lose a $10,000 Job at 2 AM Again",
  ogDescription:
    "AI-powered emergency intake and crew dispatch built for independent restoration companies.",
  keywords: [
    "restoration AI phone",
    "water damage call answering",
    "fire restoration dispatch",
    "mold remediation intake",
    "missed call recovery restoration",
    "AI answering service restoration",
    "emergency dispatch software",
    "restoration business automation",
    "Effiroad",
  ],
} as const;

export const SITE_SEO_KO = {
  title: "Effiroad | 복구(Restoration) 업체 AI 긴급 접수·디스패치",
  description:
    "Effiroad는 침수·화재·곰팡이 복구 업체가 모든 긴급 전화에 응답하고, intake·crew dispatch·분석을 자동화하도록 돕는 B2B SaaS입니다.",
  ogTitle: "Effiroad | 끝없는 성공으로 가는 길",
  ogDescription: "긴급 전화를 놓치지 않도록 돕는 AI 기반 복구 업체 플랫폼.",
} as const;

function iconUrl(path: string) {
  return `${path}?v=${SITE_ICON_VERSION}`;
}

export function getSiteIcons(): Metadata["icons"] {
  return {
    icon: [
      { url: iconUrl("/favicon.ico"), sizes: "any" },
      { url: iconUrl("/favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: iconUrl("/favicon-16.png"), sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: iconUrl("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    shortcut: iconUrl("/favicon.ico"),
  };
}

export function buildSiteMetadata(locale: "en" | "ko" = "en"): Metadata {
  const seo = locale === "ko" ? SITE_SEO_KO : SITE_SEO;
  const ogImage = `${SITE.url}${iconUrl("/apple-touch-icon.png")}`;

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: seo.title,
      template: `%s | ${SITE.name}`,
    },
    description: seo.description,
    keywords: locale === "en" ? [...SITE_SEO.keywords] : undefined,
    icons: getSiteIcons(),
    manifest: iconUrl("/site.webmanifest"),
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      type: "website",
      url: SITE.url,
      siteName: SITE.name,
      locale: locale === "ko" ? "ko_KR" : "en_US",
      images: [
        {
          url: ogImage,
          width: 180,
          height: 180,
          alt: `${SITE.name} — The Road to Limitless Success`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    alternates: {
      canonical: SITE.url,
    },
    applicationName: SITE.name,
    category: "business",
  };
}

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE.url,
    description: SITE_SEO.description,
    offers: {
      "@type": "Offer",
      price: "199",
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };
}
