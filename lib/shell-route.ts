import { headers } from "next/headers";

export type AppShell = "learn" | "topik" | "mano" | "giu" | "pricepulse" | "effiroad";

/** Resolve product shell from middleware tags, with pathname fallback. */
export async function getAppShell(): Promise<AppShell> {
  const h = await headers();
  const tagged = h.get("x-app-shell");
  if (
    tagged === "learn" ||
    tagged === "topik" ||
    tagged === "mano" ||
    tagged === "giu" ||
    tagged === "pricepulse"
  ) {
    return tagged;
  }

  const path = h.get("x-pathname") ?? "";
  if (path.startsWith("/learn")) return "learn";
  if (path.startsWith("/topik")) return "topik";
  if (path.startsWith("/mano")) return "mano";
  if (path.startsWith("/giu")) return "giu";
  if (path.startsWith("/pricepulse")) return "pricepulse";
  return "effiroad";
}

export function isIsolatedProductPath(pathname: string): boolean {
  return (
    pathname.startsWith("/learn") ||
    pathname.startsWith("/topik") ||
    pathname.startsWith("/mano") ||
    pathname.startsWith("/giu") ||
    pathname.startsWith("/pricepulse")
  );
}

export async function shouldShowEffiroadAssistant(): Promise<boolean> {
  const shell = await getAppShell();
  return shell === "effiroad";
}
