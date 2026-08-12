import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { resolveUserId } from "@/learn/lib/library/repository";
import {
  getDailyActivities,
  getRecentAttempts,
  recordMaterialViewed,
} from "@/learn/lib/activity/file-store";

export async function GET(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? 14);

    const [calendar, recent] = await Promise.all([
      getDailyActivities(userId, days),
      getRecentAttempts(userId, 10),
    ]);

    return NextResponse.json({ calendar, recent });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const body = (await request.json()) as {
      action: "view";
      materialId: string;
      materialTitle: string;
    };

    if (body.action === "view") {
      await recordMaterialViewed(userId, body.materialId, body.materialTitle);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
