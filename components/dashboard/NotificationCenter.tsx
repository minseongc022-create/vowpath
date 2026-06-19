"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CallRecord } from "@/lib/operations-analytics";
import type { JobberBookingRecord } from "@/lib/jobber-bookings";
import {
  buildDashboardNotifications,
  countUnread,
  formatNotificationTime,
  notificationIcon,
  type DashboardNotification,
} from "@/lib/notifications";
import type { RequestStatus } from "@/lib/booking-policy";
import type { TenantEvent } from "@/lib/tenant-events";
import { dashboardUi } from "@/lib/content";
import { isEnglishUi } from "@/lib/locale";
import { safeDashboardFetch } from "@/lib/dashboard-fetch";
import { useRelativeNow } from "@/lib/hooks/use-relative-now";
import type { JobCard } from "@/lib/types";

type NotificationCenterProps = {
  jobs: JobCard[];
  jobberBookings: JobberBookingRecord[];
  calls: CallRecord[];
  jobberConnected: boolean;
  jobberError: string | null;
  jobberSyncedAt: string | null;
  jobberAccountName?: string | null;
  requestStatuses?: Record<string, RequestStatus>;
  tenantEvents?: TenantEvent[];
  loading?: boolean;
  error?: string | null;
  variant?: "dropdown" | "panel";
};

function urgencyBorder(urgency: DashboardNotification["urgency"], unread: boolean) {
  if (!unread) return "notification-item-read";
  if (urgency === "high") return "notification-item-urgent-high";
  if (urgency === "medium") return "notification-item-urgent-medium";
  return "notification-item-unread";
}

function NotificationRow({
  item,
  unread,
  onNavigate,
  selectMode,
  selected,
  onToggleSelect,
  nowMs,
}: {
  item: DashboardNotification;
  unread: boolean;
  onNavigate: (item: DashboardNotification) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  nowMs: number;
}) {
  const n = dashboardUi.notifications;
  const content = (
    <>
      {selectMode ? (
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={() => onToggleSelect?.(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600"
          aria-label={
            isEnglishUi() ? `Select ${item.title}` : `${item.title} 선택`
          }
        />
      ) : null}
      <span className="mt-0.5 text-lg leading-none" aria-hidden>
        {notificationIcon(item.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`notification-item-title ${unread ? "is-unread" : ""}`}>
            {item.title}
          </p>
          {unread && !selectMode ? (
            <span className="notification-item-dot" aria-label={n.unreadAria} />
          ) : null}
        </div>
        <p className="notification-item-body">{item.body}</p>
        <p className="notification-item-time">
          {formatNotificationTime(item.createdAt, nowMs)}
        </p>
      </div>
    </>
  );

  const className = `notification-item flex gap-2 ${urgencyBorder(item.urgency, unread)}`;

  if (selectMode) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.(item.id)}
        className={`${className} w-full text-left`}
      >
        {content}
      </button>
    );
  }

  if (item.href) {
    return (
      <Link href={item.href} onClick={() => onNavigate(item)} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onNavigate(item)} className={`${className} w-full text-left`}>
      {content}
    </button>
  );
}

function NotificationListBody({
  loading,
  fetchError,
  items,
  readSet,
  onNavigate,
  onMarkAll,
  markingAll,
  selectMode,
  selectedIds,
  onToggleSelect,
  onCancelSelect,
  onConfirmSelectedDelete,
  deletingSelected,
  onDeleteAll,
  onStartSelect,
  dismissingAll,
  nowMs,
}: {
  loading: boolean;
  fetchError: string | null;
  items: DashboardNotification[];
  readSet: Set<string>;
  onNavigate: (item: DashboardNotification) => void;
  onMarkAll: () => void;
  markingAll: boolean;
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onCancelSelect: () => void;
  onConfirmSelectedDelete: () => void;
  deletingSelected: boolean;
  onDeleteAll: () => void;
  onStartSelect: () => void;
  dismissingAll: boolean;
  nowMs: number;
}) {
  const n = dashboardUi.notifications;
  if (fetchError && items.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="font-semibold text-rose-900">{n.couldntLoad}</p>
        <p className="mt-1 text-xs text-rose-700">{fetchError}</p>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <ul className="space-y-2 px-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="notification-item animate-pulse pointer-events-none">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-full rounded bg-slate-100" />
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="font-semibold text-slate-900">{n.allCaughtUp}</p>
        <p className="mt-1 text-xs text-slate-500">{n.emptyAll}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {n.eventCount(items.length)}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={onCancelSelect}
                className="text-[11px] font-semibold text-slate-500 hover:underline"
              >
                {n.cancelSelect}
              </button>
              <button
                type="button"
                onClick={onConfirmSelectedDelete}
                disabled={selectedIds.size === 0 || deletingSelected}
                className="text-[11px] font-semibold text-rose-600 hover:underline disabled:opacity-50"
              >
                {n.deleteSelectedConfirm(selectedIds.size)}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onMarkAll}
                disabled={markingAll}
                className="text-[11px] font-semibold text-brand-600 hover:underline disabled:opacity-50"
              >
                {n.markAllReadShort}
              </button>
              <button
                type="button"
                onClick={onDeleteAll}
                disabled={dismissingAll}
                className="text-[11px] font-semibold text-rose-600 hover:underline disabled:opacity-50"
              >
                {n.deleteAll}
              </button>
              <button
                type="button"
                onClick={onStartSelect}
                disabled={dismissingAll}
                className="text-[11px] font-semibold text-slate-600 hover:underline disabled:opacity-50"
              >
                {n.deleteSelected}
              </button>
            </>
          )}
        </div>
      </div>
      <ul className="max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <li key={item.id}>
            <NotificationRow
              item={item}
              unread={!readSet.has(item.id)}
              onNavigate={onNavigate}
              selectMode={selectMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={onToggleSelect}
              nowMs={nowMs}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

export function NotificationCenter({
  jobs,
  jobberBookings,
  calls,
  jobberConnected,
  jobberError,
  jobberSyncedAt,
  jobberAccountName,
  requestStatuses = {},
  tenantEvents = [],
  loading,
  error,
  variant = "dropdown",
}: NotificationCenterProps) {
  const n = dashboardUi.notifications;
  const nowMs = useRelativeNow();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [dismissingAll, setDismissingAll] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const notifications = useMemo(
    () =>
      buildDashboardNotifications({
        jobs,
        jobberBookings,
        calls,
        jobberConnected,
        jobberError,
        jobberSyncedAt,
        jobberAccountName,
        requestStatuses,
        tenantEvents,
        dismissedIds,
      }),
    [
      jobs,
      jobberBookings,
      calls,
      jobberConnected,
      jobberError,
      jobberSyncedAt,
      jobberAccountName,
      requestStatuses,
      tenantEvents,
      dismissedIds,
    ],
  );

  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const unreadCount = countUnread(notifications, readSet);

  const loadInboxState = useCallback(async () => {
    try {
      const [readRes, dismissRes] = await Promise.all([
        safeDashboardFetch("/api/notifications/read", 6_000),
        safeDashboardFetch("/api/notifications/dismiss", 6_000),
      ]);
      if (readRes?.ok) {
        const data = (await readRes.json()) as { readIds?: string[] };
        setReadIds(data.readIds ?? []);
      }
      if (dismissRes?.ok) {
        const data = (await dismissRes.json()) as { dismissedIds?: string[] };
        setDismissedIds(data.dismissedIds ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadInboxState();
  }, [loadInboxState]);

  useEffect(() => {
    if (variant !== "dropdown" || !open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, variant]);

  useLayoutEffect(() => {
    if (variant !== "dropdown" || !open) {
      setMenuPos(null);
      return;
    }
    function updatePos() {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, variant]);

  const dismissNotifications = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setDismissedIds((prev) => [...new Set([...prev, ...ids])]);
    setSelectedIds(new Set());
    setSelectMode(false);
    try {
      const res = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = (await res.json()) as { dismissedIds?: string[] };
        setDismissedIds(data.dismissedIds ?? []);
      }
    } catch {
      /* keep optimistic */
    }
  }, []);

  const dismissAll = useCallback(async () => {
    if (!window.confirm(n.confirmDeleteAll)) return;
    setDismissingAll(true);
    const allIds = notifications.map((item) => item.id);
    setDismissedIds((prev) => [...new Set([...prev, ...allIds])]);
    try {
      const res = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allIds }),
      });
      if (res.ok) {
        const data = (await res.json()) as { dismissedIds?: string[] };
        setDismissedIds(data.dismissedIds ?? []);
      }
    } catch {
      /* keep optimistic */
    } finally {
      setDismissingAll(false);
    }
  }, [notifications]);

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setReadIds((prev) => [...new Set([...prev, ...ids])]);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = (await res.json()) as { readIds?: string[] };
        setReadIds(data.readIds ?? []);
      }
    } catch {
      /* optimistic update kept */
    }
  }, []);

  const handleNavigate = useCallback(
    (item: DashboardNotification) => {
      if (selectMode) return;
      void markRead([item.id]);
      setOpen(false);
    },
    [markRead, selectMode],
  );

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true);
    const allIds = notifications.map((item) => item.id);
    setReadIds(allIds);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allIds }),
      });
      if (res.ok) {
        const data = (await res.json()) as { readIds?: string[] };
        setReadIds(data.readIds ?? allIds);
      }
    } catch {
      /* keep optimistic */
    } finally {
      setMarkingAll(false);
    }
  }, [notifications]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleStartSelect = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set());
  }, []);

  const handleCancelSelect = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleConfirmSelectedDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setDeletingSelected(true);
    await dismissNotifications(ids);
    setDeletingSelected(false);
  }, [dismissNotifications, selectedIds]);

  const listProps = {
    loading: Boolean(loading),
    fetchError: error ?? null,
    items: notifications,
    readSet,
    onNavigate: handleNavigate,
    onMarkAll: () => void handleMarkAll(),
    markingAll,
    selectMode,
    selectedIds,
    onToggleSelect: handleToggleSelect,
    onCancelSelect: handleCancelSelect,
    onConfirmSelectedDelete: () => void handleConfirmSelectedDelete(),
    deletingSelected,
    onDeleteAll: () => void dismissAll(),
    onStartSelect: handleStartSelect,
    dismissingAll,
    nowMs,
  };

  if (variant === "panel") {
    return (
      <section className="notification-center-panel" aria-labelledby="activity-panel-heading">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            {n.activity}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="activity-panel-heading" className="text-lg font-bold text-slate-900">
              {n.panelTitle}
            </h2>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {n.toReview(unreadCount)}
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-600">{n.upToDate}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{n.panelSubtitle}</p>
        </div>
        <NotificationListBody {...listProps} />
      </section>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="notification-bell-btn"
        aria-expanded={open}
        aria-label={n.bellAria(unreadCount)}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="notification-bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[90] cursor-default bg-black/5"
                aria-label={isEnglishUi() ? "Close notifications" : "알림 닫기"}
                onClick={() => setOpen(false)}
              />
              {menuPos ? (
                <div
                  className="notification-dropdown notification-dropdown-floating z-[100]"
                  style={{ top: menuPos.top, right: menuPos.right }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{n.dropdownTitle}</p>
                      <p className="text-[11px] text-slate-500">
                        {unreadCount > 0 ? n.needAttention(unreadCount) : n.youreUpToDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard/bookings");
                      }}
                      className="text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      {n.allBookingsLink}
                    </button>
                  </div>
                  <NotificationListBody {...listProps} />
                </div>
              ) : null}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}
