import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  addCompetitor,
  getAlertRules,
  getAlerts,
  getCompetitors,
  markAlertRead,
  removeCompetitor,
  upsertAlertRule,
} from "@/toss-shop/lib/store";
import { getProductsBySeller } from "@/toss-shop/lib/catalog";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [competitors, rules, alerts] = await Promise.all([
    getCompetitors(session.merchantId),
    getAlertRules(session.merchantId),
    getAlerts(session.merchantId),
  ]);

  const enriched = competitors.map((c) => ({
    ...c,
    products: getProductsBySeller(c.sellerName),
  }));

  return NextResponse.json({ competitors: enriched, rules, alerts });
}

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  try {
    const body = (await request.json()) as {
      action?: "add_competitor" | "add_rule" | "mark_read";
      sellerName?: string;
      trackedProductIds?: string[];
      rule?: Parameters<typeof upsertAlertRule>[1];
      alertId?: string;
    };

    if (body.action === "add_competitor") {
      if (!body.sellerName?.trim()) {
        return NextResponse.json({ error: "셀러명을 입력해주세요." }, { status: 400 });
      }
      const comp = await addCompetitor(
        session.merchantId,
        body.sellerName,
        body.trackedProductIds,
      );
      return NextResponse.json({ competitor: comp });
    }

    if (body.action === "add_rule" && body.rule) {
      const rule = await upsertAlertRule(session.merchantId, body.rule);
      return NextResponse.json({ rule });
    }

    if (body.action === "mark_read" && body.alertId) {
      await markAlertRead(session.merchantId, body.alertId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("[toss-shop/competitors]", e);
    return NextResponse.json({ error: "처리 중 오류" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await removeCompetitor(session.merchantId, id);
  return NextResponse.json({ ok: true });
}
