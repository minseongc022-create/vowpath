import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { searchWholesaleForConsignment } from "@/toss-shop/lib/wholesale/consignment-search";
import { buildImportSourceRecommendations } from "@/toss-shop/lib/wholesale/import-sources";
import { WHOLESALE_ENGINE_VERSION } from "@/toss-shop/lib/wholesale";

export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const body = (await request.json()) as {
    keyword?: string;
    mode?: "consignment" | "import";
    tossAvgPriceKrw?: number;
    targetRetailKrw?: number;
  };

  const keyword = body.keyword?.trim();
  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  const tossAvg = body.tossAvgPriceKrw ?? 15000;
  const target = body.targetRetailKrw ?? tossAvg;

  if (body.mode === "import") {
    const importSrc = buildImportSourceRecommendations({
      keyword,
      tossAvgPriceKrw: tossAvg,
      targetRetailKrw: target,
    });
    return NextResponse.json({
      engineVersion: WHOLESALE_ENGINE_VERSION,
      mode: "import",
      import: importSrc,
    });
  }

  const wholesale = await searchWholesaleForConsignment({
    keyword,
    tossAvgPriceKrw: tossAvg,
    targetRetailKrw: target,
  });

  return NextResponse.json({
    engineVersion: WHOLESALE_ENGINE_VERSION,
    mode: "consignment",
    wholesale,
  });
}
