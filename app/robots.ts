import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/login",
        "/signup",
        "/get-started",
        "/pay",
        "/forgot-password",
        "/onboarding",
        "/settings",
        "/demo",
        "/api/",
        "/portal",
        "/intake",
        "/r/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
