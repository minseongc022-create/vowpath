"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const EffiroadAssistantWidget = dynamic(
  () =>
    import("@/components/assistant/EffiroadAssistantWidget").then(
      (m) => m.EffiroadAssistantWidget,
    ),
  { ssr: false },
);

/** Global floating Effiroad AI — hidden on /learn and /topik (separate products). */
export function EffiroadAssistantRoot() {
  const pathname = usePathname();
  if (pathname?.startsWith("/learn") || pathname?.startsWith("/topik")) {
    return null;
  }
  return <EffiroadAssistantWidget />;
}
