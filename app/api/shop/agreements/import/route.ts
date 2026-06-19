import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { importAgreementsFromCsv } from "@/lib/agreements/import";
import { getAgreementKeeperSettings } from "@/lib/agreements/store";
import { verifySameOriginRequest } from "@/lib/security/request-guard";

export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const csv = String(body.csv ?? "");
    if (!csv.trim()) {
      return NextResponse.json({ error: "CSV content required." }, { status: 400 });
    }

    const settings = await getAgreementKeeperSettings(session.sub);
    const result = await importAgreementsFromCsv(session.sub, csv, {
      planName: settings.defaultPlanName,
      annualPriceCents: settings.defaultAnnualPriceCents,
      visitsPerYear: settings.defaultVisitsPerYear,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[shop/agreements/import]", e);
    return NextResponse.json({ error: "Import failed." }, { status: 500 });
  }
}
