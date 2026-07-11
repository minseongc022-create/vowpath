const MARQUEE_ITEMS = [
  "24/7 AI Coverage",
  "Never Miss a Call",
  "Auto Dispatch",
  "Emergency Routing",
  "Free Estimates",
  "Smart Scheduling",
] as const;

function MarqueeTrack() {
  return (
    <div className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-6 text-sm font-semibold uppercase tracking-wider text-white sm:text-base">
            {item}
          </span>
          <span className="text-brand-300" aria-hidden>
            ★
          </span>
        </span>
      ))}
    </div>
  );
}

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-white/10 bg-brand-950 py-3.5" aria-hidden>
      <div className="vow-marquee-track flex w-max">
        <MarqueeTrack />
        <MarqueeTrack />
      </div>
    </div>
  );
}
