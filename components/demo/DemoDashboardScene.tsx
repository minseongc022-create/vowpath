"use client";

import { useEffect, useState } from "react";
import { buildDemoBookingDetail } from "@/lib/demo-dashboard-fixtures";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";

type Phase = "home" | "notify" | "detail";

export function DemoDashboardScene() {
  const [phase, setPhase] = useState<Phase>("home");
  const [audioProgress, setAudioProgress] = useState(0);
  const detail = buildDemoBookingDetail();

  useEffect(() => {
    const schedule = [
      { at: 0, phase: "home" as Phase },
      { at: 2200, phase: "notify" as Phase },
      { at: 4500, phase: "detail" as Phase },
      { at: 16000, phase: "home" as Phase },
    ];
    const timers = schedule.map(({ at, phase: p }) => setTimeout(() => {
      setPhase(p);
      if (p === "home") setAudioProgress(0);
    }, at));
    const loop = setInterval(() => {
      setPhase("home");
      setAudioProgress(0);
      setTimeout(() => setPhase("notify"), 2200);
      setTimeout(() => setPhase("detail"), 4500);
    }, 16000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  useEffect(() => {
    if (phase !== "detail") return;
    const iv = setInterval(() => {
      setAudioProgress((p) => (p >= 100 ? 0 : p + 2));
    }, 200);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <div className="flex h-full w-full flex-col bg-[#faf8f5] text-[#3d3228]">
      <div className="flex items-center justify-between border-b border-[#ebe3d6] bg-white px-8 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9a7f5e]">Live product</p>
          <h1 className="text-xl font-bold">Owner dashboard</h1>
        </div>
        <img src="/logo-horizontal.png" alt="Effiroad" className="h-7 opacity-90" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-48 shrink-0 border-r border-[#ebe3d6] bg-white p-4 sm:block">
          {["Home", "Bookings", "Calendar", "Missed calls", "Settings"].map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-lg px-3 py-2 text-sm font-medium ${
                i === 0 ? "bg-[#f5f0e8] text-[#5c4a38]" : "text-stone-500"
              }`}
            >
              {item}
            </div>
          ))}
        </aside>

        <main className="relative flex-1 overflow-auto p-6">
          {phase === "notify" && (
            <div className="absolute right-6 top-4 z-10 animate-bounce rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
              <p className="text-xs font-bold text-amber-800">New P1 request</p>
              <p className="text-sm text-amber-900">Mike Wilson · Sewage backup · Austin</p>
            </div>
          )}

          {phase !== "detail" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Good evening, Ridgeline</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Calls today", value: "7" },
                  { label: "Bookings", value: "3" },
                  { label: "Pending review", value: phase === "notify" ? "1" : "0" },
                  { label: "Missed prevented", value: "12" },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="rounded-xl border border-[#ebe3d6] bg-white p-4 shadow-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase text-stone-500">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold">{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[#ebe3d6] bg-white p-4">
                <p className="text-sm font-semibold">Recent requests</p>
                <p className="mt-4 text-sm text-stone-400">Waiting for calls…</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="rounded-2xl border border-[#ebe3d6] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{detail.customerName}</h2>
                    <p className="text-sm text-stone-600">{detail.address}</p>
                  </div>
                  <PriorityBadge priority={detail.priority} />
                </div>
                <p className="mt-3 text-sm text-stone-700">{detail.issueType}</p>
                <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Pending review
                </span>
              </div>

              <div className="rounded-2xl border border-[#ebe3d6] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold">Call recording</p>
                <p className="text-xs text-stone-500">Retell AI intake · 2:14 AM</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9a7f5e] text-white">
                    ▶
                  </span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[#f5f0e8]">
                      <div
                        className="h-full rounded-full bg-[#9a7f5e] transition-all"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex h-8 items-end gap-0.5">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-1 rounded-full bg-[#b59b78]"
                          style={{
                            height: `${8 + Math.sin(i * 0.4) * 6}px`,
                            opacity: i / 40 < audioProgress / 100 ? 1 : 0.25,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ebe3d6] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold">Transcript</p>
                <pre className="mt-3 max-h-32 overflow-hidden whitespace-pre-wrap text-xs leading-relaxed text-stone-600">
                  {detail.transcript}
                </pre>
              </div>

              <div className="flex gap-3">
                <span className="flex-1 rounded-xl bg-emerald-600 py-3 text-center text-sm font-bold text-white">
                  Approve & dispatch
                </span>
                <span className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-600">
                  Pass
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
