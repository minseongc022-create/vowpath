import { headers } from "next/headers";
import { giuHref } from "./routes";

/** Server-side href that strips /giu on giucuu.com. */
export async function getGiuHref(): Promise<(path: string) => string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const shell = h.get("x-app-shell");
  const effectiveHost = shell === "giu" ? host ?? "giucuu.com" : host;
  return (path: string) => giuHref(path, effectiveHost);
}
