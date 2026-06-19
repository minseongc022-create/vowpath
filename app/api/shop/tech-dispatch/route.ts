import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getTechDispatchSettings,
  saveTechDispatchSettings,
} from "@/lib/tech-dispatch/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getTechDispatchSettings(session.sub);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await saveTechDispatchSettings(session.sub, body ?? {});
    return NextResponse.json({ ok: true, settings });
  } catch (e) {
    console.error("[shop/tech-dispatch]", e);
    return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  }
}
