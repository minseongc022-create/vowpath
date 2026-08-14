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
        setError(data.error ?? "오류가 발생했습니다");
        return;
      }
      setDone(true);
    } catch {
      setError("전송할 수 없습니다. 다시 시도해 주세요.");
    }
  }

  if (done) {
    return (
      <p className="rounded-2xl bg-giu-accent-soft px-4 py-3 text-sm font-medium text-giu-accent">
        ✓ 등록 완료! 근처에 박스가 생기면 알려드릴게요.
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
        placeholder="전화번호"
        className="giu-input"
      />
      <button type="submit" className="giu-btn-primary">
        알림 받기
      </button>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
    </form>
  );
}
