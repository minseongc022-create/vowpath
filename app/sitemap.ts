import type { MetadataRoute } from "next";
import { ROUTES, SITE } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages = [
    ROUTES.home,
    ROUTES.getStarted,
    "/pricing",
    "/hvac",
    ROUTES.privacy,
    ROUTES.terms,
  ];

  return pages.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified,
    changeFrequency: path === ROUTES.home ? "weekly" : "monthly",
    priority: path === ROUTES.home ? 1 : 0.7,
  }));
}
