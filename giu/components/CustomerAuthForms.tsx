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
    <form onSubmit={submit} className="giu-card space-y-4">
      <h2 className="text-xl font-bold text-giu-ink">Đăng nhập</h2>
      <div>
        <label className="giu-label">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="giu-input"
        />
      </div>
      <div>
        <label className="giu-label">Mật khẩu</label>
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="giu-input"
        />
      </div>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="giu-btn-primary">
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
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
    <form onSubmit={submit} className="giu-card space-y-4">
      <h2 className="text-xl font-bold text-giu-ink">Tạo tài khoản</h2>
      <p className="text-sm text-giu-muted">Thanh toán an toàn · nhận mã giải cứu ngay sau khi trả.</p>
      <div>
        <label className="giu-label">Tên</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="giu-input" />
      </div>
      <div>
        <label className="giu-label">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="giu-input"
        />
      </div>
      <div>
        <label className="giu-label">Số điện thoại</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="giu-input"
        />
      </div>
      <div>
        <label className="giu-label">Mật khẩu (tối thiểu 6 ký tự)</label>
        <input
          required
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="giu-input"
        />
      </div>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="giu-btn-primary">
        {loading ? "Đang đăng ký..." : "Đăng ký"}
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
