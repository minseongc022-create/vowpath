import type { MetadataRoute } from "next";
import { SITE_SEO } from "@/lib/site-metadata";
import { SITE } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  const v = "11";
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE_SEO.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#faf8f5",
    icons: [
      {
        src: `/favicon-16.png?v=${v}`,
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: `/favicon-32.png?v=${v}`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: `/apple-touch-icon.png?v=${v}`,
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
