import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Content Autopilot",
  description: "폰에서 3개 플랫폼 블로그 자동 생성",
  appleWebApp: {
    capable: true,
    title: "Autopilot",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1d9bf0",
};

export default function AutopilotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
