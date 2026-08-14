import { NextResponse } from "next/server";
import { getGiuStats } from "@/giu/lib/store";

export async function GET() {
  const stats = await getGiuStats();
  return NextResponse.json(stats);
}
