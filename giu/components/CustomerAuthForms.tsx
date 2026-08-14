"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGiuAuth } from "./GiuAuthProvider";

export function CustomerLoginForm() {
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
        body: JSON.stringify({ email, password, role: "customer" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Đăng nhập thất bại");
        return;
      }
      await refresh();
      router.push("/giu/hop");
      router.refresh();
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <h2 className="text-lg font-semibold">Đăng nhập</h2>
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-accent py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập →"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        Chưa có tài khoản?{" "}
        <Link href="/giu/dang-ky" className="font-semibold text-giu-primary">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}

export function CustomerRegisterForm() {
  const router = useRouter();
  const { refresh } = useGiuAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/giu/auth/register/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Đăng ký thất bại");
        return;
      }
      await refresh();
      router.push("/giu/hop");
      router.refresh();
    } catch {
      setError("Không kết nối được. Thử lại nhé.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-giu-border bg-white p-6">
      <h2 className="text-lg font-semibold">Tạo tài khoản</h2>
      <p className="text-sm text-giu-muted">Thanh toán trước, nhận mã giải cứu ngay sau khi đặt.</p>
      <div>
        <label className="block text-sm font-medium">Tên</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
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
        <label className="block text-sm font-medium">Số điện thoại</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Mật khẩu (tối thiểu 6 ký tự)</label>
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-giu-accent py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Đang đăng ký..." : "Đăng ký →"}
      </button>
      <p className="text-center text-sm text-giu-muted">
        Đã có tài khoản?{" "}
        <Link href="/giu/dang-nhap" className="font-semibold text-giu-primary">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
