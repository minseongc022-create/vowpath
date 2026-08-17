"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useGiuCustomerNavOptional } from "./GiuCustomerNavProvider";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  direction?: "forward" | "back";
};

export function GiuCustomerNavLink({ href, children, className, style, direction = "forward" }: Props) {
  const nav = useGiuCustomerNavOptional();

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => nav?.setNavDirection(direction)}
    >
      {children}
    </Link>
  );
}
