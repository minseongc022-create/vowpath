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
      // ★ effiroad.com(자비스 apex)은 뺀다.
      //
      // 이 규칙은 메인 디스패치 앱 자신의 옛 설정 페이지용이다. 그런데
      // next.config의 redirects()는 미들웨어보다 **먼저** 실행되고 호스트를
      // 가리지 않는다. 그래서 자비스가 apex(effiroad.com)를 서비스하는데도
      // `/settings`가 미들웨어의 자비스 라우팅에 닿기 전에 여기서
      // `/dashboard/settings`(은퇴한 옛 화면)로 채여 나갔다 — 실제로 배포
      // 후에도 자비스 설정 화면이 안 뜨는 사고로 나타났다.
      {
        source: "/settings",
        destination: "/dashboard/settings",
        permanent: true,
        missing: [{ type: "host", value: "effiroad.com" }],
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
