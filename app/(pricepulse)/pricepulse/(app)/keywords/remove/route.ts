import { NextResponse } from "next/server";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { removeSellerTarget } from "@/pricepulse/lib/dashboard/seller-targets.ts";

export async function POST(request: Request) {
  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.redirect(new URL("/pricepulse/login", request.url), 303);

  const formData = await request.formData();
  const targetId = String(formData.get("targetId") ?? "");
  if (targetId) await removeSellerTarget(seller.sellerId, targetId);

  return NextResponse.redirect(new URL("/pricepulse/keywords", request.url), 303);
}
