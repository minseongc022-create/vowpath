import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // undici(ProxyAgent, 토스 API 고정IP 프록시용)는 node: 스킴 내부 임포트를
  // 쓰는데 webpack이 그걸 못 다뤄서 번들링하지 않고 런타임 require로 남긴다.
  serverExternalPackages: ["undici"],
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
      {
        source: "/((?!_next/static|_next/image|videos|demo-audio|favicon.ico).*)",
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
            value: "camera=(), microphone=(), geolocation=(self)",
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
