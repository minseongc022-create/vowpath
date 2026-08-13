import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Cloudflare / localtunnel — allow mobile testing against `next dev`
  allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: "/_next/static/chunks/app/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      // HanPro /topik — cache HTML at CDN; client state is localStorage
      {
        source: "/topik",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/topik/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/((?!_next/static|_next/image|topik|videos|demo-audio|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/settings",
        destination: "/dashboard/settings",
        permanent: true,
      },
      {
        source: "/how-it-works",
        destination: "/#how-it-works",
        permanent: false,
      },
      {
        source: "/differentiators",
        destination: "/#differentiators",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
