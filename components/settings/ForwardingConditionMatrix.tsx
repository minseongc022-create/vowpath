"use client";

import {
  FORWARDING_DO_NOT_USE,
  FORWARDING_ALL_CALL_STATES,
  getForwardingConditionMatrix,
} from "@/lib/forwarding-conditions";

export function ForwardingConditionMatrix() {
  const matrix = getForwardingConditionMatrix();

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-800">{matrix.scenarioLabel}</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-800">When this happens</th>
              <th className="px-4 py-3 font-semibold text-slate-800">Your main line</th>
              <th className="px-4 py-3 font-semibold text-emerald-800">Effiroad</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.condition} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{row.condition}</td>
                <td className="px-4 py-3 text-slate-600">{row.yourMainLine}</td>
                <td className="px-4 py-3 font-medium text-emerald-800">{row.effiroad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{matrix.afterHoursNote}</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
        <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
          All call situations (quick reference)
        </p>
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className="px-4 py-2 font-semibold text-slate-700">Situation</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Your line</th>
              <th className="px-4 py-2 font-semibold text-emerald-800">Effiroad</th>
            </tr>
          </thead>
          <tbody>
            {FORWARDING_ALL_CALL_STATES.map((row) => (
              <tr key={row.condition} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-medium text-slate-800">{row.condition}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.yourMainLine}</td>
                <td className="px-4 py-2.5 text-slate-700">{row.effiroad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-950">{FORWARDING_DO_NOT_USE.title}</p>
        <p className="mt-1 text-sm text-amber-900/90">{FORWARDING_DO_NOT_USE.body}</p>
      </div>
    </div>
  );
}
