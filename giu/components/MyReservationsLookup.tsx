"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatVnd } from "@/giu/lib/format";
import type { GiuReservation } from "@/giu/lib/types";
import { useGiuAuth } from "./GiuAuthProvider";

export function MyReservationsLookup() {
  const { account, loading: authLoading } = useGiuAuth();
  const [list, setList] = useState<GiuReservation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/giu/reservations", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { reservations: GiuReservation[] };
        setList(data.reservations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "customer") void load();
  }, [account, load]);

  if (authLoading) {
    return <p className="text-sm text-giu-muted">Đang tải...</p>;
  }

  if (!account) {
    return (
      <div className="space-y-4 rounded-2xl border border-giu-border bg-white p-6 text-center">
        <p className="text-sm text-giu-muted">Đăng nhập để xem mã giải cứu đã thanh toán.</p>
        <Link
          href="/giu/dang-nhap"
          className="inline-block rounded-xl bg-giu-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-giu-muted">Đang tải đơn...</p>;
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-giu-muted">
        Chưa có đơn giải cứu nào.{" "}
        <Link href="/giu/hop" className="font-semibold text-giu-primary">
          Săn hộp ngay →
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((r) => (
        <li key={r.id}>
          <Link
            href={`/giu/dat/${r.id}`}
            className="block rounded-xl border border-giu-border bg-white p-4 hover:border-giu-primary/30"
          >
            <p className="font-mono text-xl font-bold text-giu-primary">{r.code}</p>
            <p className="text-sm text-giu-muted">
              {formatVnd(r.totalVnd)} · {r.paymentStatus} · {r.status}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
