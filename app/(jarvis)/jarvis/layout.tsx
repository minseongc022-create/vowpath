import { redirect } from "next/navigation";
import { getTossShopSession } from "@/toss-shop/lib/auth-request";
import { loadState } from "@/jarvis/core/store";
import { JarvisShell } from "@/jarvis/ui/JarvisShell";
import { JV_ROUTES } from "@/jarvis/routes";

export const dynamic = "force-dynamic";

/**
 * 자비스 화면 공통 틀.
 *
 * 검수 대기 건수는 여기서 한 번만 읽어 탭 배지로 내려준다 — 화면마다
 * 따로 세면 같은 숫자가 화면마다 다르게 보이는 일이 생긴다.
 */
export default async function JarvisLayout({ children }: { children: React.ReactNode }) {
  const session = await getTossShopSession();
  if (!session) redirect(JV_ROUTES.login);

  const state = await loadState();
  const pendingCount = state.drafts.filter((d) => d.status === "pending_review").length;

  return <JarvisShell pendingCount={pendingCount}>{children}</JarvisShell>;
}
