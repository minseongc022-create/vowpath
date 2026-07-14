"use client";

import dynamic from "next/dynamic";

const EffiroadAssistantWidget = dynamic(
  () =>
    import("@/components/assistant/EffiroadAssistantWidget").then(
      (m) => m.EffiroadAssistantWidget,
    ),
  { ssr: false },
);

/** Global floating Effiroad AI — landing, auth, dashboard, settings. */
export function EffiroadAssistantRoot() {
  return <EffiroadAssistantWidget />;
}
