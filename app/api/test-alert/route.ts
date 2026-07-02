import { NextResponse } from "next/server"
import twilio from "twilio"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isDeployed && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const header = request.headers.get("x-cron-secret");
    if (bearer !== secret && header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const ownerPhone = process.env.OWNER_ALERT_PHONE
  const fromPhone = process.env.TWILIO_PHONE_NUMBER

  if (!ownerPhone) {
    return NextResponse.json({ error: "OWNER_ALERT_PHONE not set" }, { status: 500 })
  }

  try {
    await client.messages.create({
      body: "✅ Effiroad alert test — if you got this, alerts are working correctly!",
      from: fromPhone,
      to: ownerPhone,
    })
    return NextResponse.json({ ok: true, sentTo: ownerPhone })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
