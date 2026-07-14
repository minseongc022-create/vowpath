export const OPEN_AI_EVENT = "effiroad:open-ai";

export function openEffiroadAssistant() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_AI_EVENT));
}
