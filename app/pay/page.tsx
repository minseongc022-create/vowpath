"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/** Legacy /pay redirect — Lemon Squeezy checkout opens on lemonsqueezy.com directly. */
export default function PayPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.getStarted);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <p className="max-w-md text-center text-brand-100">Redirecting to plans…</p>
    </div>
  );
}
