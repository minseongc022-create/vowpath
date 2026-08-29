import { redirect } from "next/navigation";
import { getJarvisSession } from "@/jarvis/core/session-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { LoginView } from "@/jarvis/ui/LoginView";
import { JV_ROUTES } from "@/jarvis/routes";

export const dynamic = "force-dynamic";

/**
 * 로그인 화면.
 *
 * ★ 왜 `/jarvis/login`이 아니라 `/jarvis-login`인가
 *
 * `app/(jarvis)/jarvis/layout.tsx`는 소유자가 아니면 로그인으로 돌려보낸다.
 * 로그인 화면을 그 layout 아래(`/jarvis/login`)에 두면 **로그인하러 갔다가
 * 다시 로그인으로 튕기는 무한 루프**가 된다. 그래서 layout이 걸리지 않는
 * 형제 경로에 둔다 — 공개 주소는 미들웨어가 `/login`으로 보여준다.
 */
export default async function JarvisLoginPage() {
  // 이미 로그인돼 있으면 로그인 화면을 다시 보여줄 이유가 없다
  const session = await getJarvisSession();
  if (isOwnerSession(session)) redirect(JV_ROUTES.chat);

  return <LoginView />;
}
