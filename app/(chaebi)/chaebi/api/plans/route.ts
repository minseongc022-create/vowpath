import { NextResponse } from "next/server";
import { ERRORS, requireOwner } from "@/chaebi/lib/api";
import { listPlans } from "@/chaebi/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 이 기기에서 만든 계획들 */
export async function GET(request: Request) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();
  return NextResponse.json({ plans: await listPlans(ownerId) });
}
