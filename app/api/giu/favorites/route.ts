import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import {
  getCustomerFavorites,
  setCustomerFavorites,
  toggleCustomerFavorite,
} from "@/giu/lib/store";

const syncSchema = z.object({
  merchantIds: z.array(z.string().min(1)),
});

const toggleSchema = z.object({
  merchantId: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await getGiuSessionFromRequest(request);
  if (!session || session.role !== "customer") {
    return NextResponse.json({ merchantIds: [] });
  }
  const merchantIds = await getCustomerFavorites(session.sub);
  return NextResponse.json({ merchantIds });
}

export async function PUT(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const merchantIds = await setCustomerFavorites(session.sub, parsed.data.merchantIds);
    return NextResponse.json({ merchantIds });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const result = await toggleCustomerFavorite(session.sub, parsed.data.merchantId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
