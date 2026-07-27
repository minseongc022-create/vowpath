"use client";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-soft animate-rise"
    >
      {message}
    </div>
  );
}
