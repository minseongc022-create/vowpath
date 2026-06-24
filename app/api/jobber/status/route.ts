import { NextResponse } from "next/server";
import { probeJobberInvoiceAccess } from "@/lib/jobber-api";
import { getJobberTokens } from "@/lib/jobber-tokens";
import {
  getJobberDeveloperPortalUrl,
  getJobberOriginFromRequest,
  getJobberRedirectUri,
  isJobberConfigured,
} from "@/lib/jobber-config";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isJobberConfigured();
  const redirectUri = getJobberRedirectUri(getJobberOriginFromRequest(request));
  const tokens = await getJobberTokens(session.sub);

  let invoiceAccess: {
    ok: boolean;
    error?: string;
    reconnectRecommended: boolean;
  } | null = null;

  if (tokens) {
    invoiceAccess = await probeJobberInvoiceAccess(session.sub);
  }

  return NextResponse.json({
    configured,
    connected: Boolean(tokens),
    accountName: tokens?.accountName ?? null,
    redirectUri,
    developerPortalUrl: getJobberDeveloperPortalUrl(),
    invoiceAccess,
  });
}
