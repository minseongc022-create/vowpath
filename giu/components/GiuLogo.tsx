"use client";

import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** App mark — logo only, no wordmark text beside it. */
export function GiuLogo({ size = 36, className = "", priority = false }: Props) {
  return (
    <Image
      src="/giu/logo-icon.png"
      alt="GIU"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-[22%] shadow-sm ring-1 ring-black/5 ${className}`}
    />
  );
}
