import { NextResponse } from "next/server";
import { alimtalkStatusPublic } from "@/lib/alimtalk";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(alimtalkStatusPublic());
}
