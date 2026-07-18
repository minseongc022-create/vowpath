import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import { TRIAL_DAYS } from "@/lib/billing-cohort";
import type { UiLocale } from "@/lib/locale";
import type { ShopVertical } from "@/lib/shop-vertical";

/** Cache-bust favicons and OG image after asset updates */
export const SITE_ICON_VERSION = "25";

export const OG_IMAGE_PATH = "/og-image.png";

export const SITE_SEO = {
  title: "AI Dispatch & Answering for Restoration & HVAC Companies | EFFIROAD",
  description:
    "Never lose a 2 AM water loss to voicemail. Effiroad answers 24/7, captures intake, and texts your crew — built for restoration & HVAC shops. 14-day free trial.",
  ogTitle: "EFFIROAD | Never Lose an Emergency Job at 2 AM Again",
  ogDescription:
    "AI emergency intake and crew dispatch for independent restoration and HVAC companies. Live in ~10 minutes.",
  keywords: [
    "restoration AI phone",
    "water damage call answering",
    "fire restoration dispatch",
    "mold remediation intake",
    "HVAC AI phone answering",
    "no-heat emergency dispatch",
    "missed call recovery restoration",
    "missed call recovery HVAC",
    "AI answering service restoration",
    "AI answering service HVAC",
    "emergency dispatch software",
    "home service business automation",
    "EFFIROAD",
  ],
} as const;

export const SITE_SEO_KO = {
  title: "EFFIROAD | 복구(Restoration)·HVAC 업체 AI 긴급 접수·디스패치",
  description:
    "2AM 긴급 전화를 voicemail에 놓치지 마세요. Effiroad가 24/7 응답·접수·crew SMS dispatch. 복구·HVAC 소형 업체용. 14일 무료 체험.",
  ogTitle: "EFFIROAD | 끝없는 성공으로 가는 길",
  ogDescription: "복구·HVAC 업체를 위한 AI 긴급 전화 접수 및 crew dispatch.",
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

export function buildSiteMetadata(locale: UiLocale = "en"): Metadata {
  const seo = SITE_SEO;
  const ogImage = `${SITE.url}${iconUrl(OG_IMAGE_PATH)}`;

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
      locale: locale === "es" ? "es_US" : "en_US",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE.name} — AI emergency intake and dispatch for restoration & HVAC`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
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

/** Build metadata for vertical-specific landing pages (/hvac, /plumbing, etc.) */
export function buildVerticalPageMetadata(
  vertical: ShopVertical,
  overrides: {
    title: string;
    description: string;
    ogTitle?: string;
    ogDescription?: string;
    keywords?: string[];
  },
): Metadata {
  const ogImage = `${SITE.url}${iconUrl(OG_IMAGE_PATH)}`;
  return {
    metadataBase: new URL(SITE.url),
    title: overrides.title,
    description: overrides.description,
    keywords: overrides.keywords,
    icons: getSiteIcons(),
    openGraph: {
      title: overrides.ogTitle ?? overrides.title,
      description: overrides.ogDescription ?? overrides.description,
      type: "website",
      url: `${SITE.url}/${vertical}`,
      siteName: SITE.name,
      locale: "en_US",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE.name} — ${overrides.title}`,
          type: "image/png",
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    alternates: {
      canonical: `${SITE.url}/${vertical}`,
    },
    applicationName: SITE.name,
  };
}

export function siteOrganizationJsonLd() {
  const logoUrl = `${SITE.url}/logo-schema.png`;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: logoUrl,
    email: SITE.contactEmail,
    description: SITE_SEO.description,
  };
}

export function siteJsonLd() {
  const logoUrl = `${SITE.url}/logo-schema.png`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    image: logoUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE.url,
    description: SITE_SEO.description,
    offers: {
      "@type": "Offer",
      price: SITE.monthlyPrice.replace("$", ""),
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
  };
}

export function siteFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Do I change my phone number?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Same line on Google and your trucks. You forward unanswered calls behind the scenes.",
        },
      },
      {
        "@type": "Question",
        name: "How is Effiroad different from an answering service?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Answering services take messages. Effiroad captures loss type and address, dispatches standard water jobs automatically, and texts you 1/2 on fire, Cat-3, or unclear intakes.",
        },
      },
      {
        "@type": "Question",
        name: "How fast can I go live?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "About 10 minutes: enter your contact, set on-call hours, forward your main line, and do one test call.",
        },
      },
      {
        "@type": "Question",
        name: "What happens during a storm surge when many calls come in at once?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Effiroad handles simultaneous calls — each caller goes through intake independently. Standard water jobs dispatch automatically; anything requiring judgment queues for your 1/2 reply.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a risk-free trial?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `${TRIAL_DAYS}-day free trial with phone, SMS, and dispatch included — no credit card required. Paid plans also include a 30-day money-back guarantee. Cancel anytime — no contracts, no cancellation fees.`,
        },
      },
    ],
  };
}
