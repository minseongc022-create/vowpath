import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { confirmFulfillmentTracking, listFulfillmentJobs } from "@/toss-shop/lib/store";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await listFulfillmentJobs(session.merchantId);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const body = (await request.json()) as {
    jobId?: string;
    trackingNumber?: string;
    deliveryCompany?: string;
  };

  if (!body.jobId || !body.trackingNumber) {
    return NextResponse.json({ error: "jobId and trackingNumber required" }, { status: 400 });
  }

  try {
    const job = await confirmFulfillmentTracking({
      merchantId: session.merchantId,
      jobId: body.jobId,
      trackingNumber: body.trackingNumber,
      deliveryCompany: body.deliveryCompany,
    });
    return NextResponse.json({ job, message: "송장 토스 등록 완료" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "TRACKING_FAIL";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
