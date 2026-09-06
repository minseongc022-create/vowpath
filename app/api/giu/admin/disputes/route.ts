import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminResolveDispute,
  getPlatformSettings,
  listAdminOrderSummaries,
  updatePlatformSettings,
} from "@/giu/lib/store";

const settingsSchema = z.object({
  notPickedUpGraceMinutes: z.number().int().min(30).max(480).optional(),
  maxPickupChangeHours: z.number().int().min(6).max(72).optional(),
  maxPickupChangesPerOrder: z.number().int().min(1).max(2).optional(),
  commissionRate: z.number().min(0).max(0.5).optional(),
});

const resolveSchema = z.object({
  reservationId: z.string().min(1),
  outcome: z.enum(["customer_fault", "merchant_fault", "needs_more_info", "no_issue"]),
  reason: z.string().min(4).max(500),
});

function isAdmin(request: Request): boolean {
  const key = request.headers.get("x-giu-admin-key");
  return Boolean(key && key === process.env.GIU_ADMIN_KEY?.trim());
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("orders") === "1") {
    const orders = await listAdminOrderSummaries();
    return NextResponse.json({ orders });
  }
  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "설정 형식이 올바르지 않아요" }, { status: 400 });
  }
  const settings = await updatePlatformSettings(parsed.data);
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요" }, { status: 400 });
  }
  const result = await adminResolveDispute(parsed.data.reservationId, "admin", {
    outcome: parsed.data.outcome,
    reason: parsed.data.reason,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ reservation: result });
}
