import type { Metadata, Viewport } from "next";
import "@/learn/styles/learn.css";
import { LearnAuthProvider } from "@/learn/components/providers/LearnAuthProvider";
import { LEARN_BRAND } from "@/learn/lib/brand";

export const metadata: Metadata = {
  title: {
    default: LEARN_BRAND.name,
    template: `%s · ${LEARN_BRAND.name}`,
  },
  description: LEARN_BRAND.tagline,
  robots: { index: false, follow: false },
  applicationName: LEARN_BRAND.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3182f6",
};

export default function LearnRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="learn-theme min-h-dvh">
      <LearnAuthProvider>{children}</LearnAuthProvider>
    </div>
  );
}
