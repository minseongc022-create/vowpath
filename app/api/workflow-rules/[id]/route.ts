import { NextResponse } from "next/server";
import {
  deleteWorkflowRule,
  getWorkflowRule,
  updateWorkflowRule,
} from "@/lib/workflow-rules/store";
import { getSession } from "@/lib/session";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const rule = await getWorkflowRule(session.sub, id);
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (e) {
    console.error("[workflow-rules/id GET]", e);
    return NextResponse.json({ error: "Failed to load rule" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const body = await request.json();
    const rule = await updateWorkflowRule(session.sub, id, {
      enabled: typeof body?.enabled === "boolean" ? body.enabled : undefined,
      name: typeof body?.name === "string" ? body.name : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      priority: typeof body?.priority === "number" ? body.priority : undefined,
      conditions: Array.isArray(body?.conditions) ? body.conditions : undefined,
      actions: Array.isArray(body?.actions) ? body.actions : undefined,
    });
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, rule });
  } catch (e) {
    console.error("[workflow-rules/id PATCH]", e);
    const message = e instanceof Error ? e.message : "Failed to update rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const ok = await deleteWorkflowRule(session.sub, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[workflow-rules/id DELETE]", e);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
