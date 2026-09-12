"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { relativeTime } from "../lib/format";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  projectId: string | null;
};

export function NotificationList() {
  const [items, setItems] = useState<Notification[] | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/vibesafe/notifications");
      const data = (await res.json()) as { notifications?: Notification[] };
      setItems(data.notifications ?? []);
      // 목록을 열었다는 건 읽었다는 뜻이다. 따로 누르게 하지 않는다.
      if (data.notifications?.some((n) => !n.readAt)) {
        void fetch("/api/vibesafe/notifications", { method: "POST" });
      }
    })();
  }, []);

  if (items === null) return <p className="vs-hint">불러오는 중…</p>;
  if (items.length === 0) {
    return (
      <div className="vs-empty">
        <p className="vs-empty-title">알림이 없습니다</p>
        <p className="vs-hint">정상이던 기능이 실패로 바뀌면 여기와 이메일로 알려드립니다.</p>
      </div>
    );
  }

  return (
    <ul className="vs-flow-list">
      {items.map((item) => (
        <li className="vs-flow-item" key={item.id} style={{ alignItems: "flex-start" }}>
          <span
            className="vs-status-dot"
            data-state={item.kind === "regression" ? "down" : item.kind === "recovered" ? "ok" : "unknown"}
          />
          <div style={{ minWidth: 0 }}>
            <div className="vs-flow-name">{item.title}</div>
            <p className="vs-flow-desc" style={{ whiteSpace: "pre-line" }}>
              {item.body}
            </p>
            <p className="vs-flow-desc">{relativeTime(item.createdAt)}</p>
          </div>
          <span className="vs-spacer" />
          {item.projectId && (
            <Link href={`/vibesafe/projects/${item.projectId}`} className="vs-btn vs-btn-sm">
              보러 가기
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
