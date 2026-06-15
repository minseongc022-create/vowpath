import { NextResponse } from "next/server";
import { purgeAllAccounts } from "@/lib/account-purge";

function purgeSecret(): string | undefined {
  return (
    process.env.PURGE_ACCOUNTS_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim()
  );
}

function isAuthorized(request: Request): boolean {
  const secret = purgeSecret();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = request.headers.get("x-purge-secret");
  return bearer === secret || header === secret;
}

export async function POST(request: Request) {
  const isDeployed =
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (!isDeployed) {
    return NextResponse.json(
      { error: "Only available on deployed production" },
      { status: 403 },
    );
  }

  if (!purgeSecret()) {
    return NextResponse.json(
      { error: "PURGE_ACCOUNTS_SECRET, CRON_SECRET, or AUTH_SECRET required" },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { confirm?: boolean };
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'Send JSON body { "confirm": true }' },
      { status: 400 },
    );
  }

  try {
    const result = await purgeAllAccounts();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[admin/purge-accounts]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Purge failed" },
      { status: 500 },
    );
  }
}
