import { NextResponse } from "next/server";
import { GIU_DEPLOY_VERSION } from "@/giu/lib/deploy-version";

/** Public health + deploy marker for giucuu.com post-deploy checks. */
export async function GET() {
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
