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

/** Global floating Effiroad AI — excluded from MatchCut routes. */
export function EffiroadAssistantRoot() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/matchcut")) return null;
  return <EffiroadAssistantWidget />;
}
