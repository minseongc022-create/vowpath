"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { notifyTenantEventsUpdated } from "@/lib/dashboard-data-client";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { dashboardUi } from "@/lib/content";
import {
  buildBookingDetail,
  canApprove,
  canMarkCompleted,
  canMarkScheduled,
  canReject,
  phoneTelHref,
  pickAuthoritativeRequestStatus,
  type BookingDetail,
} from "@/lib/booking-detail";
import {
  isPendingShopReview,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
} from "@/lib/booking-policy";
import { lookupStoredRequestStatus } from "@/lib/request-status-resolve";
import type { JobPriority } from "@/lib/types";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import {
  buildAllRecentBookings,
  findRecentBooking,
  formatBookingReceivedLabel,
} from "@/lib/recent-bookings";
import { useRelativeNow } from "@/lib/hooks/use-relative-now";
import { formatPriorityWithCode } from "@/lib/priority-display";
import { localizeTranscript } from "@/lib/ko-display";
import { TrustScorePanel } from "@/components/dashboard/TrustScorePanel";
import { VerificationStatusPanel } from "@/components/dashboard/VerificationStatusPanel";
import { CustomerVerificationPanel } from "@/components/dashboard/CustomerVerificationPanel";
import { BookingTimelinePanel } from "@/components/dashboard/BookingTimelinePanel";
import { CustomerCorrectionHistoryPanel } from "@/components/dashboard/CustomerCorrectionHistoryPanel";
import { toCustomerVerificationView } from "@/lib/customer-verification/labels";

/** Overrides light gradient on .booking-detail-hero / .booking-detail-card */
const BOOKING_SURFACE_DARK =
  "border-white/[0.06] bg-none shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]";
const BOOKING_HERO_DARK = `rounded-2xl border bg-[#3d3228] p-6 sm:p-8 ${BOOKING_SURFACE_DARK}`;
const BOOKING_CARD_DARK = `overflow-visible rounded-2xl border bg-[#3d3228] ${BOOKING_SURFACE_DARK}`;

const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  request_received: "bg-brand-500/15 text-brand-200 ring-1 ring-brand-500/30",
  pending_review: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  rejected: "bg-white/10 text-slate-400 ring-1 ring-white/10",
  scheduled: "bg-brand-500/15 text-indigo-200 ring-1 ring-indigo-500/30",
  completed: "bg-white/10 text-slate-300 ring-1 ring-white/10",
};

type BookingDetailContentProps = {
  bookingId: string;
  variant?: "light" | "dark";
};

export function BookingDetailContent({
  bookingId,
}: BookingDetailContentProps) {
  const t = dashboardUi.bookingDetail;
  const {
    jobs,
    jobberBookings,
    calls,
    loading,
    hasLoaded,
    error,
    requestStatuses,
    statusError,
    refresh,
    patchRequestStatuses,
    customerVerifications,
    tenantEvents,
  } = useDashboardData(null);
  const nowMs = useRelativeNow();
  const [statusSaving, setStatusSaving] = useState(false);
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<"approved" | "rejected" | null>(
    null,
  );
  const [serverDetail, setServerDetail] = useState<BookingDetail | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const decodedId = decodeURIComponent(bookingId);

  const clientDetail = useMemo(() => {
    const all = buildAllRecentBookings(jobs, jobberBookings, calls, requestStatuses);
    const baseBooking = findRecentBooking(all, decodedId, {
      jobs,
      calls,
      statuses: requestStatuses,
    });
    if (!baseBooking) return null;
    return buildBookingDetail(baseBooking, calls, jobberBookings, requestStatuses);
  }, [jobs, jobberBookings, calls, requestStatuses, decodedId]);

  const detail = useMemo(() => {
    const base = serverDetail ?? clientDetail;
    if (!base) return null;

    const requestStatus = pickAuthoritativeRequestStatus([
      lookupStoredRequestStatus(base.id, requestStatuses, base.jobberJobId),
      serverDetail?.requestStatus,
      clientDetail?.requestStatus,
      base.requestStatus,
    ]);

    return {
      ...base,
      status: requestStatus,
      requestStatus,
      requestStatusLabel: REQUEST_STATUS_LABELS[requestStatus],
      needsShopReview: isPendingShopReview(requestStatus),
      priority: clientDetail?.priority ?? base.priority,
      arrivalWindow: clientDetail?.arrivalWindow ?? base.arrivalWindow,
      priorityReasons: base.priorityReasons ?? clientDetail?.priorityReasons ?? [],
      trustScore: base.trustScore ?? clientDetail?.trustScore,
      verification: base.verification ?? clientDetail?.verification,
    };
  }, [serverDetail, clientDetail, requestStatuses]);

  useEffect(() => {
    let cancelled = false;
    setLookupLoading(!clientDetail);
    setLookupError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/bookings/lookup?id=${encodeURIComponent(decodedId)}`,
        );
        if (cancelled) return;
        if (!res.ok) {
          if (res.status !== 404) {
            const data = (await res.json()) as { error?: string };
            setLookupError(data.error ?? t.loadFailed);
          }
          setServerDetail(null);
          return;
        }
        const data = (await res.json()) as { detail?: BookingDetail };
        const loaded = data.detail ?? null;
        setServerDetail(loaded);
        if (loaded?.requestStatus) {
          patchRequestStatuses({ [decodedId]: loaded.requestStatus });
        }
      } catch {
        if (!cancelled) setLookupError(t.loadFailed);
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decodedId, patchRequestStatuses]);

  useEffect(() => {
    if (clientDetail) setLookupLoading(false);
  }, [clientDetail]);

  useEffect(() => {
    if (
      detail &&
      !isPendingShopReview(detail.requestStatus) &&
      (actionError?.includes("cannot approve") ||
        actionError?.includes("already handled") ||
        actionError?.includes("승인할 수 없는"))
    ) {
      setActionError(null);
    }
  }, [detail?.requestStatus, actionError]);

  const reloadServerDetail = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/bookings/lookup?id=${encodeURIComponent(decodedId)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { detail?: BookingDetail };
      setServerDetail(data.detail ?? null);
    } catch {
      /* keep merged client state */
    }
  }, [decodedId]);
  const pageLoading =
    !detail && !hasLoaded && loading && jobs.length === 0 && lookupLoading;
  const pageError = lookupError ?? error;

  const customerVerification = useMemo(
    () => customerVerifications.find((r) => r.bookingId === decodedId) ?? null,
    [customerVerifications, decodedId],
  );

  const updateStatus = useCallback(
    async (status: RequestStatus) => {
      if (!detail) return;
      setStatusSaving(true);
      setActionError(null);

      patchRequestStatuses({ [detail.id]: status });

      try {
        const res = await fetch("/api/bookings/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: detail.id, status }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          status?: RequestStatus;
          statuses?: Record<string, RequestStatus>;
          error?: string;
        };
        if (!res.ok) {
          patchRequestStatuses({ [detail.id]: detail.requestStatus });
          setActionError(data.error ?? t.statusUpdateFailed);
          return;
        }
        if (data.statuses) {
          patchRequestStatuses(data.statuses);
        } else if (data.status) {
          patchRequestStatuses({ [detail.id]: data.status });
        }
        void reloadServerDetail();
        void refresh();
        window.dispatchEvent(new CustomEvent("vowpath:bookings-status-updated"));
        window.dispatchEvent(new CustomEvent("vowpath:jobs-updated"));
        notifyTenantEventsUpdated();
      } catch {
        patchRequestStatuses({ [detail.id]: detail.requestStatus });
        setActionError(t.statusNetworkError);
      } finally {
        setStatusSaving(false);
      }
    },
    [detail, patchRequestStatuses, refresh, reloadServerDetail],
  );

  const updatePriority = useCallback(
    async (priority: JobPriority) => {
      if (!detail) return;
      setPrioritySaving(true);
      setActionError(null);
      try {
        const res = await fetch("/api/bookings/priority", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: detail.id, priority }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) {
          setActionError(data.error ?? t.priorityUpdateFailed);
          return;
        }
        await refresh();
        window.dispatchEvent(new CustomEvent("vowpath:jobs-updated"));
        window.dispatchEvent(new CustomEvent("vowpath:calls-updated"));
      } catch {
        setActionError(t.priorityNetworkError);
      } finally {
        setPrioritySaving(false);
      }
    },
    [detail, refresh],
  );

  const telHref = detail ? phoneTelHref(detail.phone) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/bookings"
        className="text-sm font-medium text-brand-300 transition hover:text-brand-200 hover:underline"
      >
        {t.backToList}
      </Link>

      {pageError && !detail ? (
        <ErrorPanel message={pageError} />
      ) : pageLoading ? (
        <DetailSkeleton />
      ) : !detail ? (
        <NotFoundPanel />
      ) : (
        <div className="mt-6 space-y-5">
          {detail.needsShopReview ? (
            <div className="booking-detail-banner booking-detail-banner-warn">
              <p className="font-semibold text-amber-100">{t.pendingReviewTitle}</p>
              <p className="mt-1 text-amber-100/90">{t.pendingReviewBody}</p>
            </div>
          ) : null}

          <RequestDecisionBar
            status={detail.requestStatus}
            statusLabel={detail.requestStatusLabel}
            saving={statusSaving}
            onApprove={() => setPendingConfirm("approved")}
            onReject={() => setPendingConfirm("rejected")}
          />

          <BookingStatusConfirmDialog
            action={pendingConfirm}
            saving={statusSaving}
            onConfirm={() => {
              if (!pendingConfirm) return;
              void updateStatus(pendingConfirm).finally(() => setPendingConfirm(null));
            }}
            onCancel={() => setPendingConfirm(null)}
          />

          <header className={`booking-detail-hero ${BOOKING_HERO_DARK}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {t.serviceRequest}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {detail.customerName}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  {detail.issueType} · {formatBookingReceivedLabel(detail.createdAt, nowMs)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PriorityBadge priority={detail.priority} theme="dark" />
                  <StatusBadge label={detail.requestStatusLabel} styleKey={detail.requestStatus} />
                  {customerVerification ? (
                    <CustomerVerificationBadge record={customerVerification} />
                  ) : null}
                </div>
              </div>

              <ActionBar
                detail={detail}
                telHref={telHref}
                saving={statusSaving}
                onScheduled={() => void updateStatus("scheduled")}
                onCompleted={() => void updateStatus("completed")}
              />
            </div>

            {statusError || actionError ? (
              <p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {actionError ?? statusError}
              </p>
            ) : null}
          </header>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <InfoCard title={t.customerInfo}>
                <InfoRow label={t.name} value={detail.customerName} />
                <InfoRow
                  label={t.phone}
                  value={detail.phone}
                  highlight={detail.phone !== "—"}
                />
                <InfoRow label={t.address} value={detail.address || "—"} />
                <InfoRow label={t.cityState} value={detail.cityState} />
                <InfoRow label={t.zip} value={detail.zipCode} />
              </InfoCard>

              {detail.trustScore ? (
                <TrustScorePanel trust={detail.trustScore} />
              ) : null}
              {detail.verification ? (
                <VerificationStatusPanel verification={detail.verification} />
              ) : null}
              <CustomerVerificationPanel
                record={customerVerification}
                title={t.customerVerificationTitle}
              />
              <CustomerCorrectionHistoryPanel record={customerVerification} />
            </div>

            <InfoCard title={t.requestInfo}>
              <InfoRow label={t.issueType} value={detail.issueType} />
              <InfoRow label={t.priority} value={formatPriorityWithCode(detail.priority)} />
              <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t.changePriority}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["P1", "P2", "P3"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={prioritySaving || detail.priority === p}
                      onClick={() => void updatePriority(p)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-brand-500/30 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {formatPriorityWithCode(p)}
                    </button>
                  ))}
                </div>
              </div>
              <InfoRow label={t.requestDateTime} value={detail.bookingDateTime} />
              <InfoRow label={t.status} value={detail.requestStatusLabel} />
              {detail.arrivalWindow ? (
                <InfoRow label={t.customerPreference} value={detail.arrivalWindow} />
              ) : null}
            </InfoCard>
          </div>

          <BookingTimelinePanel
            detail={detail}
            tenantEvents={tenantEvents}
            verification={customerVerification}
          />

          {(detail.priorityReasons?.length ?? 0) > 0 ? (
            <InfoCard
              title={t.priorityReasonTitle}
              subtitle={
                detail.prioritySource === "manual"
                  ? t.priorityReasonManual
                  : t.priorityReasonAi
              }
            >
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
                {detail.priorityReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </InfoCard>
          ) : null}

          <InfoCard
            title={t.callSummaryTitle}
            subtitle={detail.linkedCallId ? t.callSummaryLinked : t.callSummaryUnlinked}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
              {detail.callSummary}
            </p>
          </InfoCard>

          <InfoCard title={t.transcriptTitle} subtitle={t.transcriptSubtitle}>
            {detail.transcript ? (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#2a221c] p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {localizeTranscript(detail.transcript)}
                </p>
              </div>
            ) : (
              <EmptyBlock text={t.transcriptEmpty} />
            )}
          </InfoCard>

          <InfoCard title={t.recordingTitle} subtitle={t.recordingSubtitle}>
            {detail.recordingUrl ? (
              <audio
                controls
                preload="none"
                className="w-full rounded-lg"
                src={detail.recordingUrl}
              >
                {t.audioUnsupported}
              </audio>
            ) : (
              <EmptyBlock text={t.recordingEmpty} />
            )}
          </InfoCard>
        </div>
      )}
    </div>
  );
}

const CUSTOMER_VERIFY_BADGE: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  orange: "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30",
  amber: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  slate: "bg-white/10 text-slate-400 ring-1 ring-white/10",
};

function CustomerVerificationBadge({
  record,
}: {
  record: import("@/lib/customer-verification/types").CustomerVerificationRecord;
}) {
  const view = toCustomerVerificationView(record);
  if (!view) return null;
  const cls = CUSTOMER_VERIFY_BADGE[view.badgeTone] ?? CUSTOMER_VERIFY_BADGE.slate;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${cls}`}
    >
      {view.badgeLabel}
    </span>
  );
}

function StatusBadge({ label, styleKey }: { label: string; styleKey: RequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${REQUEST_STATUS_STYLES[styleKey]}`}
    >
      {label}
    </span>
  );
}

function BookingStatusConfirmDialog({
  action,
  saving,
  onConfirm,
  onCancel,
}: {
  action: "approved" | "rejected" | null;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = dashboardUi.bookingDetail;
  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [action, saving, onCancel]);

  if (!action || typeof document === "undefined") return null;

  const isApprove = action === "approved";
  const title = isApprove ? t.confirmApproveTitle : t.confirmRejectTitle;
  const body = isApprove ? t.confirmApproveBody : t.confirmRejectBody;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
        aria-label={t.cancel}
        disabled={saving}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="booking-confirm-title"
        aria-describedby="booking-confirm-body"
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#3d3228] p-6 shadow-2xl"
      >
        <h2 id="booking-confirm-title" className="text-lg font-bold text-white">
          {title}
        </h2>
        <p id="booking-confirm-body" className="mt-2 text-sm text-slate-400">
          {body}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className={
              isApprove
                ? "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                : "inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            }
          >
            {saving ? t.saving : t.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RequestDecisionBar({
  status,
  statusLabel,
  saving,
  onApprove,
  onReject,
}: {
  status: RequestStatus;
  statusLabel: string;
  saving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const t = dashboardUi.bookingDetail;
  const showActions = canApprove(status) || canReject(status);

  if (!showActions) {
    return (
      <section className="booking-detail-banner booking-detail-banner-info">
        {status === "approved" ? (
          <p>
            <span className="font-semibold text-emerald-300">{t.approvedBanner}</span> —{" "}
            {t.approvedBannerBody}
          </p>
        ) : status === "rejected" ? (
          <p>
            <span className="font-semibold text-slate-200">{t.rejectedBanner}</span> —{" "}
            {t.rejectedBannerBody}
          </p>
        ) : (
          <p>{t.currentStatus(statusLabel)}</p>
        )}
      </section>
    );
  }

  return (
    <section className="booking-detail-decision" aria-label={t.decisionTitle}>
      <p className="text-sm font-semibold text-white">{t.decisionTitle}</p>
      <p className="mt-1 text-xs text-slate-500">{t.decisionSubtitle}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onApprove}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t.saving : t.approve}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onReject}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t.saving : t.reject}
        </button>
      </div>
    </section>
  );
}

function ActionBar({
  detail,
  telHref,
  saving,
  onScheduled,
  onCompleted,
}: {
  detail: BookingDetail;
  telHref: string | null;
  saving: boolean;
  onScheduled: () => void;
  onCompleted: () => void;
}) {
  const t = dashboardUi.bookingDetail;
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[14rem]">
      {telHref ? (
        <a href={telHref} className="booking-action-primary">
          {t.callCustomer}
        </a>
      ) : (
        <button type="button" disabled className="booking-action-muted">
          {t.noPhone}
        </button>
      )}
      {detail.jobberWebUri ? (
        <a
          href={detail.jobberWebUri}
          target="_blank"
          rel="noopener noreferrer"
          className="booking-action-secondary"
        >
          {t.openJobber}
        </a>
      ) : (
        <button type="button" disabled className="booking-action-muted">
          {t.jobberUnavailable}
        </button>
      )}
      {canMarkScheduled(detail.requestStatus) ? (
        <button
          type="button"
          disabled={saving}
          onClick={onScheduled}
          className="booking-action-secondary"
        >
          {t.markScheduled}
        </button>
      ) : null}
      {canMarkCompleted(detail.requestStatus) ? (
        <button
          type="button"
          disabled={saving}
          onClick={onCompleted}
          className="booking-action-secondary"
        >
          {t.markCompleted}
        </button>
      ) : null}
    </div>
  );
}

function InfoCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`booking-detail-card ${BOOKING_CARD_DARK}`}>
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="px-5 py-2 sm:px-6">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-white/[0.04] py-3 last:border-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`text-sm sm:col-span-2 ${highlight ? "font-semibold text-white" : "font-medium text-slate-200"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-5">
      <div className={`booking-detail-hero h-40 ${BOOKING_HERO_DARK}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`booking-detail-card h-56 ${BOOKING_CARD_DARK}`} />
        <div className={`booking-detail-card h-56 ${BOOKING_CARD_DARK}`} />
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  const t = dashboardUi.bookingDetail;
  return (
    <div className="vow-dash-card mt-6 px-6 py-10 text-center">
      <p className="font-semibold text-rose-300">{t.loadFailed}</p>
      <p className="mt-1 text-sm text-rose-200/80">{message}</p>
    </div>
  );
}

function NotFoundPanel() {
  const t = dashboardUi.bookingDetail;
  return (
    <div className="vow-dash-card mt-6 px-6 py-12 text-center">
      <p className="font-semibold text-white">{t.notFoundTitle}</p>
      <p className="mt-2 text-sm text-slate-400">{t.notFoundBody}</p>
      <Link
        href="/dashboard/bookings"
        className="mt-4 inline-block text-sm font-semibold text-brand-300 hover:underline"
      >
        {t.viewAll}
      </Link>
    </div>
  );
}
