import { NextResponse } from "next/server";
import { ensureTenantTwilioPhone } from "@/lib/twilio-provision";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/users-db";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await findUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const result = await ensureTenantTwilioPhone(session.sub, {
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
      { error: e instanceof Error ? e.message : "번호 발급에 실패했습니다." },
      { status: 500 },
    );
  }
}
