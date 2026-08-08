import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getConnections, saveConnections, sessionValid } from "@/lib/content-autopilot/store";

const COOKIE = "autopilot_session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!(await sessionValid(token))) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, string>;
  const cur = await getConnections();
  const now = new Date().toISOString();
  const platform = body.platform;

  if (platform === "wordpress") {
    cur.wordpress = {
      baseUrl: (body.siteUrl || "").replace(/\/$/, ""),
      username: body.username || "",
      appPassword: body.appPassword || "",
      connectedAt: now,
    };
  } else if (platform === "blogger") {
    cur.blogger = {
      blogId: body.blogId || "",
      accessToken: body.accessToken || "",
      connectedAt: now,
    };
  } else if (platform === "naver") {
    const id = body.naverId || "";
    cur.naver = {
      blogId: id,
      blogUrl: id ? `https://blog.naver.com/${id}` : undefined,
      connectedAt: now,
    };
  } else {
    return NextResponse.json({ ok: false, error: "unknown platform" }, { status: 400 });
  }

  await saveConnections(cur);
  return NextResponse.json({ ok: true, connections: cur });
}
