import { NextResponse } from "next/server";
import { getManoStats } from "@/mano/lib/store";

export async function GET() {
  const stats = await getManoStats();
  return NextResponse.json({ stats });
}
