"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useGiuCustomerNav } from "./GiuCustomerNavProvider";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function GiuCustomerBackLink({ href, children, className }: Props) {
  const { setNavDirection } = useGiuCustomerNav();

  return (
    <Link
      href={href}
      className={className}
      onClick={() => setNavDirection("back")}
    >
      {children}
    </Link>
  );
}
