import { NextResponse } from "next/server";
import { getCurrentSeller } from "@/pricepulse/lib/dashboard/auth.ts";
import { getSellerPlan } from "@/pricepulse/lib/dashboard/plan.ts";
import { addSellerTarget } from "@/pricepulse/lib/dashboard/seller-targets.ts";

export async function POST(request: Request) {
  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.redirect(new URL("/pricepulse/login", request.url), 303);

  const formData = await request.formData();
  const query = String(formData.get("query") ?? "");

  const { plan } = await getSellerPlan(seller.sellerId);
  const result = await addSellerTarget(seller.sellerId, query, plan);

  const url = new URL(result && "upgrade" in result ? "/pricepulse/upgrade" : "/pricepulse/keywords", request.url);
  if ("error" in result) url.searchParams.set("error", encodeURIComponent(result.error));
  return NextResponse.redirect(url, 303);
}
