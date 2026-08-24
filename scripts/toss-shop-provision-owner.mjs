/**
 * 오너 계정 프로비저닝 — 사장님 계정을 안전하게 생성/재설정한다.
 *
 * 사용법:
 *   TOSS_SHOP_OWNER_PASSWORD='<비밀번호>' node --import tsx scripts/toss-shop-provision-owner.mjs
 *   (프로덕션 KV에 쓰려면 KV_REST_API_URL / KV_REST_API_TOKEN 도 함께 설정)
 *
 * ⚠️ 비밀번호는 이 저장소에 절대 커밋하지 않는다.
 * 환경변수로만 받고, 해시(bcrypt)만 저장한다. 로그에도 찍지 않는다.
 *
 * 오너 판정은 TOSS_SHOP_OWNER_EMAILS(vercel.json)에 있는 이메일로 이뤄지고,
 * 오너는 getPlanAccess에서 무제한(fullAccess)이 된다. 즉 이 계정만 무료다.
 * 다른 사람이 가입하면 free 플랜이고, 오너의 토스 API 키도 상속받지 않는다.
 */
import { loadEnvLocal } from "./lib/load-env.mjs";

loadEnvLocal();

const email = (process.env.TOSS_SHOP_OWNER_EMAILS ?? "").split(",")[0]?.trim().toLowerCase();
const password = process.env.TOSS_SHOP_OWNER_PASSWORD?.trim();
const name = process.env.TOSS_SHOP_OWNER_NAME?.trim() || "대표";
const shopName = process.env.TOSS_SHOP_OWNER_SHOP?.trim() || "에피로드 상점";

if (!email) {
  console.error("✗ TOSS_SHOP_OWNER_EMAILS 가 비어 있습니다 (vercel.json 또는 .env.local).");
  process.exit(1);
}
if (!password || password.length < 12) {
  console.error("✗ TOSS_SHOP_OWNER_PASSWORD 를 12자 이상으로 설정하세요.");
  console.error("  예: TOSS_SHOP_OWNER_PASSWORD='...' node --import tsx scripts/toss-shop-provision-owner.mjs");
  process.exit(1);
}

const { createAccount, setAccountPassword, findAccountByEmail } = await import(
  "../toss-shop/lib/store.ts"
);

const existing = await findAccountByEmail(email);

if (existing) {
  await setAccountPassword(email, password);
  console.log(`↻ 기존 오너 계정 비밀번호 재설정: ${email}`);
} else {
  await createAccount({ email, password, name, shopName });
  console.log(`✓ 오너 계정 생성: ${email}`);
}

const account = await findAccountByEmail(email);
const { getPlanAccess } = await import("../toss-shop/lib/billing.ts");
const access = getPlanAccess(account);

console.log(`  플랜: ${access.label} · 전체기능 ${access.fullAccess ? "O" : "X"} · 오너 ${access.isOwner ? "O" : "X"}`);
console.log(`  상점: ${account.merchantId}`);
if (!access.isOwner) {
  console.log("  ⚠ 오너로 인식되지 않았습니다 — TOSS_SHOP_OWNER_EMAILS 를 확인하세요.");
}
console.log("\n비밀번호는 출력하지 않습니다. 안전한 곳에 보관하세요.");
