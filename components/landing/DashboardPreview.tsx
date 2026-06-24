"use client";

const MOCK_SERIES = [
  { calls: 3, bookings: 1 },
  { calls: 5, bookings: 2 },
  { calls: 4, bookings: 3 },
  { calls: 8, bookings: 4 },
  { calls: 6, bookings: 5 },
  { calls: 9, bookings: 6 },
  { calls: 7, bookings: 7 },
];

function MiniChart() {
  const width = 320;
  const height = 120;
  const pad = 8;
  const max = 10;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const toPoints = (key: "calls" | "bookings") =>
    MOCK_SERIES.map((d, i) => {
      const x = pad + (i / (MOCK_SERIES.length - 1)) * innerW;
      const y = pad + innerH - (d[key] / max) * innerH;
      return `${x},${y}`;
    }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <polyline
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        points={toPoints("calls")}
      />
      <polyline
        fill="none"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
        points={toPoints("bookings")}
      />
    </svg>
  );
}

export function DashboardPreview() {
  return (
    <div className="startup-dashboard-preview">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[11px] font-medium text-slate-400">vowroad.com/dashboard</span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {[
          { label: "Inbound calls", value: "128", delta: "+12%" },
          { label: "Bookings", value: "47", delta: "+18%" },
          { label: "Recovered est.", value: "$4.2k", delta: "illustrative" },
          { label: "Pending", value: "3", delta: "needs you" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{m.label}</p>
            <p className="mt-1 text-lg font-bold text-white">{m.value}</p>
            <p className="text-[10px] font-semibold text-emerald-400">{m.delta}</p>
          </div>
        ))}
      </div>

      <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-slate-950/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-white">Call & booking trends</p>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((p) => (
              <span
                key={p}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  p === "30d" ? "bg-brand-500 text-white" : "text-slate-500"
                }`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="h-28">
          <MiniChart />
        </div>
      </div>

      <div className="mx-4 mb-4 space-y-2">
        {[
          { title: "No heat · P1", time: "2m ago", tone: "urgent" },
          { title: "AC tune-up booked", time: "18m ago", tone: "ok" },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  item.tone === "urgent" ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
              <span className="text-xs font-medium text-slate-200">{item.title}</span>
            </div>
            <span className="text-[10px] text-slate-500">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
