import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  getJarvisAutopilotForMerchant,
  runAutopilotForMerchant,
} from "@/toss-shop/lib/store";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const report = await getJarvisAutopilotForMerchant(session.merchantId);
  return NextResponse.json({ report });
}

export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  try {
    const report = await runAutopilotForMerchant(session.merchantId);
    return NextResponse.json({ report });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AUTOPILOT_FAIL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
