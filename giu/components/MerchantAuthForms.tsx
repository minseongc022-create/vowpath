"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { GIu_DISTRICTS } from "@/giu/lib/districts";
import { useGiuAuth } from "./GiuAuthProvider";

export function MerchantLoginForm() {
  const router = useRouter();
  const { refresh } = useGiuAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/giu/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role: "merchant" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Đăng nhập thất bại");
        return;
      }
      await refresh();
      router.push("/giu/cua-hang/panel");
      router.refresh();
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <h2 className="text-lg font-semibold">Đăng nhập quán</h2>
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Mật khẩu</label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập..." : "Vào panel →"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        Chưa có quán?{" "}
        <Link href="/giu/cua-hang" className="font-semibold text-giu-primary">
          Đăng ký quán
        </Link>
      </p>
    </form>
  );
}

export function MerchantSignupForm() {
  const router = useRouter();
  const { refresh } = useGiuAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/giu/auth/register/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          password: fd.get("password"),
          category: fd.get("category"),
          district: fd.get("district"),
          address: fd.get("address"),
          phone: fd.get("phone"),
          zalo: fd.get("zalo") || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra");
        return;
      }
      await refresh();
      router.push("/giu/cua-hang/panel");
      router.refresh();
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <h2 className="text-lg font-semibold">Đăng ký quán</h2>
      <div>
        <label className="block text-sm font-medium">Tên quán *</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Email đăng nhập *</label>
        <input
          name="email"
          required
          type="email"
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Mật khẩu * (tối thiểu 6 ký tự)</label>
        <input
          name="password"
          required
          type="password"
          minLength={6}
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
        <label className="block text-sm font-medium">Địa chỉ quán *</label>
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
          <input name="zalo" type="tel" className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm" />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-primary py-3 text-sm font-semibold text-white hover:bg-giu-primary-hover disabled:opacity-60"
      >
        {loading ? "Đang đăng ký..." : "Đăng quán & vào panel →"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        Đã có quán?{" "}
        <Link href="/giu/cua-hang/dang-nhap" className="font-semibold text-giu-primary">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
