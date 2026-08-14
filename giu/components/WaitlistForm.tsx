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
      <p className="rounded-2xl bg-giu-accent-soft px-4 py-3 text-sm font-medium text-giu-accent">
        ✓ Đã ghi nhận! Tụi mình nhắn bạn khi có hộp gần đây.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        required
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="SĐT của bạn"
        className="giu-input"
      />
      <button type="submit" className="giu-btn-primary">
        Báo tôi nhé
      </button>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
    </form>
  );
}
