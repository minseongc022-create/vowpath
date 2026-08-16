"use client";

export function MerchantPanelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="giu-card space-y-3">
        <div className="h-6 w-40 rounded-lg bg-giu-bg" />
        <div className="h-4 w-full rounded-lg bg-giu-bg" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-[12px] bg-giu-bg" />
          ))}
        </div>
      </div>
      <div className="giu-card h-48 rounded-[20px] bg-giu-bg" />
      <div className="giu-card h-32 rounded-[20px] bg-giu-bg" />
    </div>
  );
}
