"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className = "text-sm font-medium text-slate-600 hover:text-slate-900",
  label = "로그아웃",
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {label}
    </button>
  );
}
