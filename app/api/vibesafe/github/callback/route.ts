import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordEvent } from "@/vibesafe/lib/analytics";
import { safeCompare } from "@/vibesafe/lib/crypto";
import { connectWithInstallation } from "@/vibesafe/lib/github/connection";
import { getSession } from "@/vibesafe/lib/session";
import { GITHUB_INSTALL_STATE_COOKIE } from "@/vibesafe/lib/github/install-state";

/** 설치 후 GitHub이 되돌려보내는 자리. 실패해도 사용자는 화면에서 이유를 본다. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const state = url.searchParams.get("state");

  const back = (error?: string) => {
    const target = new URL("/vibesafe/projects/new", url.origin);
    if (error) target.searchParams.set("github_error", error);
    else target.searchParams.set("github", "connected");
    const response = NextResponse.redirect(target);
    response.cookies.set(GITHUB_INSTALL_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  };

  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/vibesafe/login", url.origin));

  const expected = (await cookies()).get(GITHUB_INSTALL_STATE_COOKIE)?.value;
  if (!state || !expected || !safeCompare(state, expected)) {
    return back("state");
  }
  if (!installationId || !/^\d+$/.test(installationId)) return back("installation");

  try {
    await connectWithInstallation(session.userId, installationId);
    await recordEvent({
      name: "github_connected",
      userId: session.userId,
      props: { authKind: "app_installation" },
    });
    return back();
  } catch (error) {
    console.error("[vibesafe] github install callback failed:", (error as Error).message);
    return back("connect");
  }
}

export const dynamic = "force-dynamic";
