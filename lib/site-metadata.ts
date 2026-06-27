import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

/** Cache-bust favicons after asset updates */
export const SITE_ICON_VERSION = "12";

export const SITE_SEO = {
  title: "Effiroad | AI Customer Automation for HVAC Businesses",
  description:
    "Effiroad helps HVAC businesses answer every call, automate follow-ups, schedule appointments, and grow with AI-powered efficiency. AI voice, SMS, scheduling, analytics, and automation in one platform.",
  ogTitle: "Effiroad | The Road to Limitless Success",
  ogDescription:
    "AI-powered efficiency designed to help businesses capture every opportunity.",
  keywords: [
    "HVAC AI",
    "AI customer automation",
    "missed call recovery",
    "AI phone answering",
    "HVAC scheduling software",
    "AI SMS automation",
    "HVAC business analytics",
    "field service automation",
    "Effiroad",
  ],
} as const;

export const SITE_SEO_KO = {
  title: "Effiroad | HVAC AI 고객 자동화 플랫폼",
  description:
    "Effiroad는 HVAC 업체가 모든 전화에 응답하고, 후속 연락·예약을 자동화하며 AI 기반 효율로 성장하도록 돕는 B2B SaaS 플랫폼입니다.",
  ogTitle: "Effiroad | 끝없는 성공으로 가는 길",
  ogDescription: "모든 기회를 놓치지 않도록 돕는 AI 기반 효율 플랫폼.",
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
