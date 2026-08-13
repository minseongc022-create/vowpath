"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { isIsolatedProductPath } from "@/lib/isolated-product-path";

const EffiroadAssistantWidget = dynamic(
  () =>
    import("@/components/assistant/EffiroadAssistantWidget").then(
      (m) => m.EffiroadAssistantWidget,
    ),
  { ssr: false },
);

/** Global floating Effiroad AI — hidden on isolated products (/learn, /topik). */
export function EffiroadAssistantRoot() {
  const pathname = usePathname();
  if (isIsolatedProductPath(pathname)) {
    return null;
  }
  return <EffiroadAssistantWidget />;
}
