"use client";

import { SessionProvider } from "next-auth/react";

export function DajeongAuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/dajeong/api/auth">{children}</SessionProvider>;
}
