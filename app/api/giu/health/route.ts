import { NextRequest, NextResponse } from "next/server";
import { GIU_DEPLOY_VERSION } from "@/giu/lib/deploy-version";

function isBrowserDocumentRequest(request: NextRequest): boolean {
  const accept = request.headers.get("accept") ?? "";
  const secFetchDest = request.headers.get("sec-fetch-dest");
  if (secFetchDest === "document") return true;
  return accept.includes("text/html") && !accept.includes("application/json");
}

/** Public health + deploy marker for giucuu.com post-deploy checks. */
export async function GET(request: NextRequest) {
  if (isBrowserDocumentRequest(request)) {
    return NextResponse.redirect(new URL("/hop", request.url), 302);
  }

  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GITHUB_SHA?.slice(0, 7) ??
    null;

  return NextResponse.json({
    ok: true,
    service: "giu",
    deployVersion: GIU_DEPLOY_VERSION,
    commit,
    features: {
      customerQrUx: true,
      inAppDirections: true,
      merchantClosedTab: true,
      merchantLogout: true,
      customerLogout: true,
    },
  });
}
