"use client";

export type GoLiveNavItem = {
  id: string;
  step: string;
  label: string;
  done: boolean;
  optional?: boolean;
};

export function GoLiveStepNav({ items }: { items: GoLiveNavItem[] }) {
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="vow-golive-nav -mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-min gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollTo(item.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
              item.done
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : item.optional
                  ? "border-brand-200 bg-white text-brand-800"
                  : "border-amber-200 bg-amber-50/80 text-amber-950"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                item.done
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-inherit ring-1 ring-inset ring-current/20"
              }`}
            >
              {item.done ? "✓" : item.step.replace(/\D/g, "") || "·"}
            </span>
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
