"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isGiuMapHomePath } from "@/giu/lib/routes";
import { getCustomerNavOrder } from "@/giu/lib/customer-nav-order";

export type GiuCustomerNavDirection = "forward" | "back";

type GiuCustomerNavContextValue = {
  slide: GiuCustomerNavDirection;
  setNavDirection: (dir: GiuCustomerNavDirection) => void;
};

const GiuCustomerNavContext = createContext<GiuCustomerNavContextValue | null>(null);

export function useGiuCustomerNav(): GiuCustomerNavContextValue {
  const ctx = useContext(GiuCustomerNavContext);
  if (!ctx) {
    throw new Error("useGiuCustomerNav must be used within GiuCustomerNavProvider");
  }
  return ctx;
}

export function useGiuCustomerNavOptional(): GiuCustomerNavContextValue | null {
  return useContext(GiuCustomerNavContext);
}

export function GiuCustomerNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [slide, setSlide] = useState<GiuCustomerNavDirection>("forward");
  const pendingDir = useRef<GiuCustomerNavDirection | null>(null);
  const prevOrder = useRef(getCustomerNavOrder(pathname));

  const setNavDirection = useCallback((dir: GiuCustomerNavDirection) => {
    pendingDir.current = dir;
  }, []);

  useEffect(() => {
    const order = getCustomerNavOrder(pathname);
    if (pendingDir.current) {
      setSlide(pendingDir.current);
      pendingDir.current = null;
    } else if (order > prevOrder.current) {
      setSlide("forward");
    } else if (order < prevOrder.current) {
      setSlide("back");
    }
    prevOrder.current = order;
  }, [pathname]);

  return (
    <GiuCustomerNavContext.Provider value={{ slide, setNavDirection }}>
      {children}
    </GiuCustomerNavContext.Provider>
  );
}

export function GiuCustomerPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { slide } = useGiuCustomerNav();
  const isMapHome = isGiuMapHomePath(pathname);

  return (
    <div
      key={pathname}
      className={`giu-tab-panel-3d min-h-0 flex-1 ${
        isMapHome ? "h-full overflow-hidden" : ""
      } ${slide === "forward" ? "is-forward" : "is-back"}`}
    >
      {children}
    </div>
  );
}
