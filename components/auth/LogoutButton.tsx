"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { useLocale } from "@/components/providers/LocaleProvider";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className = "text-sm font-medium text-slate-600 hover:text-slate-900",
  label,
}: LogoutButtonProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const text = label ?? (locale === "ko" ? "로그아웃" : "Sign out");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {text}
    </button>
  );
}
