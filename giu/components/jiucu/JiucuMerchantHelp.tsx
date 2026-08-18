"use client";

type Props = {
  bubble: string;
  caption?: string;
  className?: string;
};

/** Merchant publish hero — base body static, waving arm animates separately. */
export function JiucuMerchantHelp({ bubble, caption, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative w-full max-w-[300px]">
        <div className="giu-jiucu-merchant-bubble absolute left-1/2 top-2 z-20 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-white px-3.5 py-2 text-[12px] font-bold text-giu-ink shadow-[0_4px_18px_rgba(60,42,33,0.08)] ring-1 ring-giu-border/80">
          {bubble}
          <span
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white ring-1 ring-giu-border/80"
            aria-hidden
          />
        </div>

        <div className="relative flex min-h-[200px] items-end justify-center overflow-visible rounded-[20px] bg-white px-3 pb-3 pt-12">
          <div
            className="pointer-events-none absolute inset-x-10 bottom-5 h-8 rounded-full bg-[rgba(60,42,33,0.04)] blur-lg"
            aria-hidden
          />

          <div className="giu-jiucu-merchant-jump relative h-[172px] w-[220px] max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/giu/jiucu/merchant-help-base.png"
              alt=""
              width={220}
              height={172}
              className="absolute inset-0 h-full w-full object-contain object-bottom"
              draggable={false}
              decoding="async"
              aria-hidden
            />
            <div
              className="absolute"
              style={{
                left: "3.8%",
                top: "17.8%",
                width: "28%",
                height: "32%",
              }}
            >
              <div className="giu-jiucu-wave-arm h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/giu/jiucu/merchant-help-arm.png"
                  alt="지우쿠"
                  className="h-full w-full object-contain object-left-top"
                  draggable={false}
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {caption ? (
        <p className="max-w-[260px] text-center text-[12px] font-semibold leading-snug text-giu-muted">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
