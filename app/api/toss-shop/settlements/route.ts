import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { parseSettlementCsv } from "@/toss-shop/lib/settlement-csv";
import {
  getSettlementSummary,
  getSettlements,
  importSettlementsCsv,
  reconcileSettlement,
} from "@/toss-shop/lib/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [rows, summary] = await Promise.all([
    getSettlements(session.merchantId),
    getSettlementSummary(session.merchantId),
  ]);

  return NextResponse.json({ rows, summary });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      const text = await request.text();
      const parsed = parseSettlementCsv(text);
      const result = await importSettlementsCsv(session.merchantId, parsed);
      return NextResponse.json(result);
    }

    const body = (await request.json()) as {
      action?: "import" | "reconcile";
      csv?: string;
      settlementId?: string;
      actualPayoutKrw?: number;
    };

    if (body.action === "import" && body.csv) {
      const parsed = parseSettlementCsv(body.csv);
      const result = await importSettlementsCsv(session.merchantId, parsed);
      return NextResponse.json(result);
    }

    if (body.action === "reconcile" && body.settlementId && body.actualPayoutKrw != null) {
      const row = await reconcileSettlement(
        session.merchantId,
        body.settlementId,
        body.actualPayoutKrw,
      );
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ row });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("[toss-shop/settlements]", e);
    return NextResponse.json({ error: "처리 중 오류" }, { status: 500 });
  }
}
