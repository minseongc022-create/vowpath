"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GIU_ROUTES } from "@/giu/lib/routes";
import { formatReservationStatus, formatVnd } from "@/giu/lib/format";
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
    return <p className="text-sm text-giu-muted">불러오는 중...</p>;
  }

  if (!account) {
    return (
      <div className="giu-card space-y-4 text-center">
        <p className="text-sm text-giu-muted">로그인하면 결제한 구출 코드를 볼 수 있습니다.</p>
        <Link href={GIU_ROUTES.auth} className="giu-btn-primary block text-center">
          로그인 / 회원가입
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-giu-muted">주문 불러오는 중...</p>;
  }

  if (list.length === 0) {
    return (
      <div className="giu-card text-center text-sm text-giu-muted">
        구출 주문이 없습니다.{" "}
        <Link href="/giu/hop" className="font-semibold text-giu-primary">
          박스 찾기 →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {list.map((r) => (
        <li key={r.id}>
          <Link href={`/giu/dat/${r.id}`} className="giu-list-row shadow-giu-sm block">
            <div className="flex-1">
              <p className="font-mono text-xl font-bold text-giu-primary">{r.code}</p>
              <p className="mt-1 text-sm text-giu-muted">
                {formatVnd(r.totalVnd)} · {formatReservationStatus(r.status)}
              </p>
            </div>
            <span className="text-giu-muted">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
