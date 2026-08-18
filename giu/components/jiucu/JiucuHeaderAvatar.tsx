"use client";

/** 3D floating Jiucu face for merchant header welcome line. */
export function JiucuHeaderAvatar({ className = "" }: { className?: string }) {
  return (
    <div className={`giu-jiucu-header-3d shrink-0 ${className}`} aria-hidden>
      <div className="giu-jiucu-header-3d-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/giu/jiucu/avatar-head.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain drop-shadow-[0_3px_8px_rgba(60,42,33,0.12)]"
          draggable={false}
          decoding="async"
        />
      </div>
    </div>
  );
}
