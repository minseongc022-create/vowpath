export function HeroFlowSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8 px-2" aria-hidden>
      <div className="space-y-4 text-center">
        <div className="mx-auto h-6 w-48 rounded-full bg-white/10" />
        <div className="mx-auto h-10 w-full max-w-lg rounded-lg bg-white/10" />
        <div className="mx-auto h-5 w-full max-w-md rounded bg-white/5" />
      </div>
      <div className="space-y-4 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-8">
        <div className="h-8 rounded-lg bg-white/5" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
