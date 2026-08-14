"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReserveForm({ boxId, salePriceVnd }: { boxId: string; salePriceVnd: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/giu/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxId,
          customerName: name,
          customerPhone: phone,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra");
        return;
      }
      if (data.id) router.push(`/giu/dat/${data.id}`);
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <h3 className="text-lg font-semibold text-giu-ink">Giữ chỗ miễn phí</h3>
      <p className="text-sm text-giu-muted">
        Thanh toán tại quán khi lấy hộp · {salePriceVnd.toLocaleString("vi-VN")}₫
      </p>
      <div>
        <label className="block text-sm font-medium text-giu-ink">Tên của bạn</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
          placeholder="VD: Minh Anh"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-giu-ink">Số điện thoại</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
          placeholder="VD: 0901234567"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-accent py-3 text-sm font-semibold text-white hover:bg-giu-accent-hover disabled:opacity-60"
      >
        {loading ? "Đang giữ chỗ..." : "Giải cứu ngay →"}
      </button>
    </form>
  );
}
