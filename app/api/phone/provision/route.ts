import { NextResponse } from "next/server";
import { apiErrorsEn } from "@/lib/api-errors-en";
import { requireEntitledSession } from "@/lib/entitlements";
import { ensureTenantTwilioPhone } from "@/lib/twilio-provision";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/users-db";

export async function POST() {
  const entitled = await requireEntitledSession();
  if (!entitled.ok) return entitled.response;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(entitled.userId);
  if (!user) {
    return NextResponse.json({ error: apiErrorsEn.userNotFound }, { status: 404 });
  }

  try {
    const result = await ensureTenantTwilioPhone(entitled.userId, {
      shopPhone: user.phone,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      phoneNumber: result.phoneNumber,
      created: result.created,
      legacy: result.legacy ?? false,
    });
  } catch (e) {
    console.error("[phone/provision]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : apiErrorsEn.phoneProvisionFailed },
      { status: 500 },
    );
  }
}
