import { Suspense } from "react";
import { GiuAuthRedirect } from "@/giu/components/GiuRoleGuard";
import { GiuAuthScreen } from "@/giu/components/GiuAuthScreen";

export default function GiuAuthPage() {
  return (
    <GiuAuthRedirect>
      <Suspense fallback={<p className="giu-page text-sm text-giu-muted">불러오는 중...</p>}>
        <GiuAuthScreen />
      </Suspense>
    </GiuAuthRedirect>
  );
}
