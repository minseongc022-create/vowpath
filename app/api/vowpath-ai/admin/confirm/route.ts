import { NextResponse } from "next/server";
import {
  AiAdminExecutionError,
  executeAiAdminAction,
} from "@/lib/ai-admin/execute";
import type { AiAdminConfirmRequest } from "@/lib/ai-admin/types";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as AiAdminConfirmRequest;
    const result = await executeAiAdminAction({
      userId: session.sub,
      action: body.action,
      password: body.password,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof AiAdminExecutionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[vowpath-ai/admin/confirm]", e);
    return NextResponse.json({ error: "Admin action failed" }, { status: 500 });
  }
}
