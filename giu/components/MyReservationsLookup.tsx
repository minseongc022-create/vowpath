"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPickupWindow, formatVnd } from "@/giu/lib/format";
import type { GiuReservation } from "@/giu/lib/types";

export function MyReservationsLookup() {
  const [phone, setPhone] = useState("");
  const [list, setList] = useState<GiuReservation[]>([]);
  const [searched, setSearched] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/giu/reservations?phone=${encodeURIComponent(phone)}`);
    const data = (await res.json()) as { reservations: GiuReservation[] };
    setList(data.reservations ?? []);
    setSearched(true);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="flex gap-2">
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="SĐT đã đặt"
          className="flex-1 rounded-xl border border-giu-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-giu-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Tìm
        </button>
      </form>

      {searched && list.length === 0 ? (
        <p className="text-sm text-giu-muted">Chưa có mã giải cứu nào với SĐT này.</p>
      ) : null}

      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.id}>
            <Link
              href={`/giu/dat/${r.id}`}
              className="block rounded-xl border border-giu-border bg-white p-4 hover:border-giu-primary/30"
            >
              <p className="font-mono text-xl font-bold text-giu-primary">{r.code}</p>
              <p className="text-sm text-giu-muted">
                {formatVnd(r.totalVnd)} · {r.status}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
