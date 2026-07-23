import { NextResponse } from "next/server";
import { fetchJobberAccount, probeJobberInvoiceAccess } from "@/lib/jobber-api";
import { getJobberTokens } from "@/lib/jobber-tokens";
import {
  getJobberDeveloperPortalUrl,
  getJobberClientId,
  getJobberOriginFromRequest,
  getJobberRedirectUri,
  getJobberRecommendedCallbackUris,
  isJobberConfigured,
  JOBBER_PRODUCTION_CALLBACK_URI,
} from "@/lib/jobber-config";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = isJobberConfigured();
  const redirectUri = getJobberRedirectUri(getJobberOriginFromRequest(request));
  let tokens = await getJobberTokens(session.sub);

  let invoiceAccess: {
    ok: boolean;
    error?: string;
    reconnectRecommended: boolean;
  } | null = null;

  if (tokens) {
    if (!tokens.accountName) {
      try {
        await fetchJobberAccount(session.sub);
        tokens = (await getJobberTokens(session.sub)) ?? tokens;
      } catch (e) {
        console.warn("[jobber/status] account refresh", e);
      }
    }

    invoiceAccess = await probeJobberInvoiceAccess(session.sub);
  }

  const clientId = getJobberClientId() || null;

  return NextResponse.json({
    configured,
    connected: Boolean(tokens),
    accountName: tokens?.accountName ?? null,
    accountId: tokens?.accountId ?? null,
    accountEmail: tokens?.accountEmail ?? null,
    accountPhone: tokens?.accountPhone ?? null,
    connectedAt: tokens?.updatedAt ?? null,
    redirectUri,
    recommendedCallbackUris: getJobberRecommendedCallbackUris(),
    productionCallbackUri: JOBBER_PRODUCTION_CALLBACK_URI,
    clientId,
    developerPortalUrl: getJobberDeveloperPortalUrl(),
    invoiceAccess,
  });
}
