import { NextResponse } from "next/server";
import {
  getCompanyAiMemory,
  saveCompanyAiMemory,
} from "@/lib/company-ai-memory";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const memory = await getCompanyAiMemory(session.sub);
    return NextResponse.json({ memory });
  } catch (e) {
    console.error("[company-ai-memory GET]", e);
    return NextResponse.json({ error: "Failed to load AI memory" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const memory = await saveCompanyAiMemory(session.sub, {
      serviceAreas: body?.serviceAreas,
      businessHours: body?.businessHours,
      holidayRules: body?.holidayRules,
      emergencyPolicy: body?.emergencyPolicy,
      approvalPolicy: body?.approvalPolicy,
      specialInstructions: body?.specialInstructions,
      dailyBriefingSmsEnabled: body?.dailyBriefingSmsEnabled,
      dailyBriefingSmsTime: body?.dailyBriefingSmsTime,
    });
    return NextResponse.json({ ok: true, memory });
  } catch (e) {
    console.error("[company-ai-memory PUT]", e);
    if (e instanceof Error && e.message === "KV_REQUIRED") {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to save AI memory" }, { status: 500 });
  }
}
