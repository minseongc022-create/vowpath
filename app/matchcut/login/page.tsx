import Link from "next/link";
import { MatchCutAuthForm } from "@/components/matchcut/MatchCutAuthForm";
import { MatchCutLogo } from "@/components/matchcut/MatchCutShell";
import { MATCHCUT_ROUTES } from "@/lib/matchcut/constants";

export default function MatchCutLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-slate-50 px-4 py-12">
      <Link href={MATCHCUT_ROUTES.home}>
        <MatchCutLogo className="text-slate-900" />
      </Link>
      <div className="mt-8 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">로그인</h1>
        <div className="mt-6">
          <MatchCutAuthForm mode="login" />
        </div>
      </div>
    </div>
  );
}
