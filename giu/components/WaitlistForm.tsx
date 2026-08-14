"use client";

import { useState } from "react";

export function WaitlistForm({ district }: { district?: string }) {
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/giu/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, district }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Có lỗi");
        return;
      }
      setDone(true);
    } catch {
      setError("Không gửi được. Thử lại nhé.");
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-giu-primary/10 px-4 py-3 text-sm text-giu-primary">
        ✓ Đã ghi nhận! Tụi mình nhắn bạn khi có hộp gần đây.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        required
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="SĐT của bạn"
        className="flex-1 rounded-xl border border-giu-border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-xl bg-giu-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Báo tôi nhé
      </button>
      {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
    </form>
  );
}
