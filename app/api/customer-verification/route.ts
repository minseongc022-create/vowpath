import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listCustomerVerifications } from "@/lib/customer-verification/store";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await listCustomerVerifications(session.sub);
    return NextResponse.json({ ok: true, records });
  } catch (e) {
    console.error("[customer-verification]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load" },
      { status: 500 },
    );
  }
}
