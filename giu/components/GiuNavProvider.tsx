"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { giuHref as giuHrefRaw } from "@/giu/lib/routes";

const GiuNavContext = createContext(false);

/** true when links must omit /giu (giucuu.com public URLs). */
export function GiuNavProvider({
  publicPaths,
  children,
}: {
  publicPaths: boolean;
  children: ReactNode;
}) {
  return <GiuNavContext.Provider value={publicPaths}>{children}</GiuNavContext.Provider>;
}

export function useGiuPublicPaths(): boolean {
  return useContext(GiuNavContext);
}

/** Build a navigation href for the current host. */
export function useGiuHref(): (internalPath: string) => string {
  const publicPaths = useGiuPublicPaths();
  return useMemo(
    () => (internalPath: string) => {
      if (publicPaths) {
        return giuHrefRaw(internalPath, "giucuu.com");
      }
      if (typeof window !== "undefined") {
        return giuHrefRaw(internalPath);
      }
      return giuHrefRaw(internalPath, null);
    },
    [publicPaths],
  );
}
