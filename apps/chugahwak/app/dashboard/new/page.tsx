"use client";

import { Suspense } from "react";
import NewCoInner from "./NewCoInner";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">불러오는 중…</div>
      }
    >
      <NewCoInner />
    </Suspense>
  );
}
