"use client";

/** Jiucu face beside merchant welcome — white background, no harsh compositing. */
export function JiucuHeaderAvatar({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/giu/jiucu/avatar-head-white.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 object-contain"
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
