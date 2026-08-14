"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-giu-accent px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      In / PDF
    </button>
  );
}
