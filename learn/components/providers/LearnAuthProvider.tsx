"use client";

import { SessionProvider } from "next-auth/react";

export function LearnAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/learn/api/auth">
      {children}
    </SessionProvider>
  );
}
