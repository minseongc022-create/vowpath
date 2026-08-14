"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { GIu_DISTRICTS } from "@/giu/lib/districts";

export function MerchantSignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          category: fd.get("category"),
          district: fd.get("district"),
          address: fd.get("address"),
          phone: fd.get("phone"),
          zalo: fd.get("zalo") || undefined,
        }),
      });
      const data = (await res.json()) as { merchant?: { id: string; phone: string }; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra");
        return;
      }
      if (data.merchant) {
        localStorage.setItem("giu_merchant_phone", data.merchant.phone);
        router.push("/giu/cua-hang/panel");
      }
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <div>
        <label className="block text-sm font-medium">Tên quán *</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Loại hình *</label>
          <select name="category" required className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm">
            {GIu_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Quận *</label>
          <select name="district" required className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm">
            {GIu_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Địa chỉ *</label>
        <input
          name="address"
          required
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
          placeholder="Số nhà, đường, quận"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">SĐT *</label>
          <input
            name="phone"
            required
            type="tel"
            className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
            placeholder="0901234567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Zalo (tuỳ chọn)</label>
          <input
            name="zalo"
            type="tel"
            className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-primary py-3 text-sm font-semibold text-white hover:bg-giu-primary-hover disabled:opacity-60"
      >
        {loading ? "Đang đăng ký..." : "Đăng quán miễn phí →"}
      </button>
    </form>
  );
}
