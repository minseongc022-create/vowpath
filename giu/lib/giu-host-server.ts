import { headers } from "next/headers";
import { getGiuPublicOrigin, isGiuHost } from "@/giu/lib/giu-host";
import { normalizeHostname } from "@/lib/canonical-host";

/** Prefer the live request host so www vs apex metadataBase never loops. */
export async function resolveGiuPublicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const hostname = normalizeHostname(host);
  if (isGiuHost(hostname)) {
    return `https://${hostname}`;
  }
  return getGiuPublicOrigin();
}
