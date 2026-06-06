import { NextResponse } from "next/server";
import {
  clearOperationFailures,
  collapseOperationFailures,
  listOperationFailures,
} from "@/lib/ops-failures";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await listOperationFailures(session.sub, 100);
  const failures = collapseOperationFailures(raw).slice(0, 20);
  return NextResponse.json({ failures });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await clearOperationFailures(session.sub);
  return NextResponse.json({ ok: true });
}
