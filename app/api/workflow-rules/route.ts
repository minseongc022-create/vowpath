import { NextResponse } from "next/server";
import {
  listWorkflowRules,
  saveWorkflowRule,
} from "@/lib/workflow-rules/store";
import type { WorkflowRuleDraft } from "@/lib/workflow-rules/types";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rules = await listWorkflowRules(session.sub);
    return NextResponse.json({ rules });
  } catch (e) {
    console.error("[workflow-rules GET]", e);
    return NextResponse.json({ error: "Failed to load automation rules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as WorkflowRuleDraft;
    const rule = await saveWorkflowRule(session.sub, {
      ...body,
      source: body.source ?? "manual",
      createdBy: session.sub,
    });
    return NextResponse.json({ ok: true, rule });
  } catch (e) {
    console.error("[workflow-rules POST]", e);
    const message = e instanceof Error ? e.message : "Failed to create automation rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
