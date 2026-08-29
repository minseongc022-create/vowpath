/**
 * 비밀번호를 잊었을 때를 위한 임시 재설정 통로.
 *
 * ★ 한 번 쓰고 지운다
 *
 * 이 세션에서 써 온 패턴이다 — CRON_SECRET로 잠근 임시 라우트를 만들어
 * 한 번 실행하고, 확인이 끝나면 지운다. 상시 열려 있을 이유가 없는
 * 관리용 통로를 남겨두면 그 자체가 공격 표면이 된다.
 *
 * ★ 새 비밀번호는 이 응답에도, 어떤 로그에도 안 남는다
 *
 * 이 라우트는 GitHub Actions에서 한 번 실행되고 그 로그를 사람이 읽는다.
 * 만약 여기서 새 비밀번호를 돌려주면 그 값이 워크플로 로그에 그대로
 * 남는다 — 저장소가 개인 계정이어도, 로그는 "사장님만 아는 값"이
 * 아니게 된다. 그래서 새 비밀번호는 **사장님이 이미 등록해 둔 휴대폰으로
 * 문자로만** 보낸다. 이 응답에는 성공 여부와 가려진 번호만 담는다.
 *
 * ★ 이메일을 입력받지 않는다
 *
 * 소유자 이메일은 이미 서버가 안다(TOSS_SHOP_OWNER_EMAILS). 호출하는
 * 쪽에서 이메일을 넘기게 하면 그 값이 워크플로 입력·로그에 남고, 굳이
 * 필요하지도 않다 — 소유자가 한 명(또는 정해진 소수)뿐이므로 서버가
 * 알고 있는 모든 소유자의 비밀번호를 재설정한다.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ownerEmails } from "@/jarvis/core/access";
import { setOwnerPassword } from "@/jarvis/core/owner-auth";
import { loadState } from "@/jarvis/core/store";
import { sendPasswordResetSms } from "@/jarvis/engine/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 헷갈리는 글자(0/O, 1/l/I)를 뺀 글자판 — 문자로 받아 직접 타이핑할 값이다 */
const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 12): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CHARS[bytes[i] % CHARS.length];
  return out;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer !== secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emails = ownerEmails();
  if (!emails.length) {
    return NextResponse.json(
      { ok: false, reason: "TOSS_SHOP_OWNER_EMAILS가 비어 있어 소유자를 알 수 없습니다" },
      { status: 400 },
    );
  }

  const state = await loadState();
  const phone = state.settings.alertPhone;
  if (!phone) {
    return NextResponse.json(
      {
        ok: false,
        reason: "등록된 휴대폰 번호가 없어 새 비밀번호를 보낼 곳이 없습니다",
      },
      { status: 400 },
    );
  }

  const newPassword = generatePassword();
  for (const email of emails) {
    await setOwnerPassword(email, newPassword);
  }

  const result = await sendPasswordResetSms(phone, newPassword, state.settings);

  return NextResponse.json({
    ok: result.sent,
    reason: result.sent ? undefined : result.reason,
    resetCount: emails.length,
    sentToMasked: result.sent ? maskPhone(phone) : undefined,
  });
}
