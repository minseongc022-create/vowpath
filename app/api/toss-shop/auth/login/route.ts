import { NextResponse } from "next/server";
import { verifySameOriginRequest } from "@/lib/security/request-guard";
import { authenticateAccount, createAccount, getMerchant, syncMerchantNow } from "@/toss-shop/lib/store";
import { isApiConfigured } from "@/toss-shop/lib/api/sync-merchant";
import { isOwnerEmail } from "@/toss-shop/lib/billing";
import {
  createTossShopSessionToken,
  tossShopSessionCookieOptions,
} from "@/toss-shop/lib/auth";

/**
 * ★ 이 서비스는 자비스 — 사장님 한 명의 상점을 돌리는 개인 자동화다.
 *
 * 자비스의 저장소(jarvis/core/store.ts)는 가맹점별로 나뉘지 않은
 * **하나의 전역 상태**다. 여러 셀러가 각자의 상점을 여는 SaaS가 아니라,
 * 사장님 한 명의 대화·목표·전화번호·연동 설정을 담는 곳이라 그렇게
 * 설계했다.
 *
 * 그런데 회원가입(mode: "signup")은 원래 열려 있었다 — 이메일과 비밀번호만
 * 있으면 **누구나** 새 계정을 만들고 로그인할 수 있었고, 로그인만 되면
 * 그 사람도 사장님의 자비스 화면(대화 기록·목표 금액·전화번호·연동 상태)을
 * 그대로 보고, 설정까지 바꿀 수 있었다. 실제 키 값(Toss/도매꾹 시크릿)은
 * 화면에 항상 마스킹돼 나가 원문이 새지는 않았지만, 그 외 전부가 노출돼
 * 있었다 — 자비스가 전역 상태인 이상 로그인 자체를 사장님 한 명으로
 * 막아야 안전하다.
 *
 * 그래서 이메일이 TOSS_SHOP_OWNER_EMAILS(소유자 이메일)이 아니면
 * 회원가입도 로그인도 여기서 거절한다.
 */
export async function POST(request: Request) {
  const forbidden = verifySameOriginRequest(request);
  if (forbidden) return forbidden;

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      shopName?: string;
      mode?: "login" | "signup";
    };

    const email = body.email?.trim();
    const password = body.password?.trim();
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    // 소유자가 아니면 계정이 있는지조차 알려주지 않는다 — "이미 사용 중인
    // 이메일입니다" 같은 응답도 계정 존재 여부를 흘리는 정보다.
    if (!isOwnerEmail(email)) {
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    let account;
    if (body.mode === "signup") {
      const name = body.name?.trim() || "셀러";
      const shopName = body.shopName?.trim() || `${name}의 상점`;
      try {
        account = await createAccount({ email, password, name, shopName });
      } catch (e) {
        if (e instanceof Error && e.message === "EMAIL_TAKEN") {
          return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
        }
        throw e;
      }
    } else {
      account = await authenticateAccount(email, password);
      if (!account) {
        return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
      }
    }

    const token = await createTossShopSessionToken({
      sub: account.id,
      email: account.email,
      name: account.name,
      merchantId: account.merchantId,
    });

    const merchant = await getMerchant(account.merchantId);
    if (merchant && isApiConfigured(merchant)) {
      void syncMerchantNow(account.merchantId);
    }

    const res = NextResponse.json({
      ok: true,
      user: { email: account.email, name: account.name, merchantId: account.merchantId },
    });
    res.cookies.set(tossShopSessionCookieOptions(token));
    return res;
  } catch (e) {
    console.error("[toss-shop/auth/login]", e);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
