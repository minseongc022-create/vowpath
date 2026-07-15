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
import {
  findJobsToUpdateForBooking,
  lookupStoredRequestStatus,
} from "@/lib/request-status-resolve";
import type { JobCard, JobPriority } from "@/lib/types";
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
import { CustomerOnMyWayPanel } from "@/components/dashboard/CustomerOnMyWayPanel";
import { toCustomerVerificationView } from "@/lib/customer-verification/labels";

/** Overrides light gradient on .booking-detail-hero / .booking-detail-card */
const BOOKING_SURFACE =
  "border-brand-200/70 bg-white shadow-[0_1px_2px_rgb(61_50_40/0.05),0_8px_28px_rgb(61_50_40/0.08)]";
const BOOKING_HERO = `booking-detail-hero rounded-2xl border ${BOOKING_SURFACE} p-6 sm:p-8`;
const BOOKING_CARD = `booking-detail-card overflow-visible rounded-2xl border ${BOOKING_SURFACE}`;

const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  request_received: "bg-brand-100 text-brand-800 ring-1 ring-brand-200",
  pending_review: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  approved: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  rejected: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
  scheduled: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  completed: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
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

  const linkedJob = useMemo(
    () => findJobsToUpdateForBooking(decodedId, jobs, calls)[0] ?? null,
    [jobs, calls, decodedId],
  );

  const linkedCall = useMemo(
    () => (detail?.linkedCallId ? calls.find((c) => c.id === detail.linkedCallId) ?? null : null),
    [calls, detail?.linkedCallId],
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
        window.dispatchEvent(new CustomEvent("effiroad:bookings-status-updated"));
        window.dispatchEvent(new CustomEvent("effiroad:jobs-updated"));
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
        window.dispatchEvent(new CustomEvent("effiroad:jobs-updated"));
        window.dispatchEvent(new CustomEvent("effiroad:calls-updated"));
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

          <header className={`booking-detail-hero ${BOOKING_HERO}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  {t.serviceRequest}
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">
                  {detail.customerName}
                </h1>
                <p className="mt-1 text-sm text-stone-600">
                  {detail.issueType} · {formatBookingReceivedLabel(detail.createdAt, nowMs)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PriorityBadge priority={detail.priority} theme="light" />
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
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
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
              {linkedCall?.qualityScore != null ? (
                <CallQualityScorePanel
                  score={linkedCall.qualityScore}
                  reasoning={linkedCall.qualityReasoning}
                />
              ) : null}
              {detail.verification ? (
                <VerificationStatusPanel verification={detail.verification} />
              ) : null}
              <CustomerVerificationPanel
                record={customerVerification}
                title={t.customerVerificationTitle}
              />
              <CustomerCorrectionHistoryPanel record={customerVerification} />
              {linkedJob ? (
                <QuoteEstimateCard bookingId={decodedId} job={linkedJob} onSaved={refresh} />
              ) : null}
            </div>

            <InfoCard title={t.requestInfo}>
              <InfoRow label={t.issueType} value={detail.issueType} />
              <InfoRow label={t.priority} value={formatPriorityWithCode(detail.priority)} />
              <div className="border-t border-brand-200/60 px-4 py-3 sm:px-5">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  {t.changePriority}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["P1", "P2", "P3"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={prioritySaving || detail.priority === p}
                      onClick={() => void updatePriority(p)}
                      className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              <CustomerOnMyWayPanel
                bookingId={decodedId}
                customerName={detail.customerName}
              />
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
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700">
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
            <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">
              {detail.callSummary}
            </p>
          </InfoCard>

          <InfoCard title={t.transcriptTitle} subtitle={t.transcriptSubtitle}>
            {detail.transcript ? (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-brand-200/70 bg-stone-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
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
  green: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  orange: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
  amber: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  slate: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
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
        className="relative w-full max-w-sm rounded-2xl border border-brand-200 bg-white p-6 shadow-2xl"
      >
        <h2 id="booking-confirm-title" className="text-lg font-bold text-brand-950">
          {title}
        </h2>
        <p id="booking-confirm-body" className="mt-2 text-sm text-stone-600">
          {body}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="vow-dash-btn-secondary disabled:opacity-50"
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
            <span className="font-semibold text-emerald-700">{t.approvedBanner}</span> —{" "}
            {t.approvedBannerBody}
          </p>
        ) : status === "rejected" ? (
          <p>
            <span className="font-semibold text-stone-700">{t.rejectedBanner}</span> —{" "}
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
      <p className="text-sm font-semibold text-brand-950">{t.decisionTitle}</p>
      <p className="mt-1 text-xs text-stone-500">{t.decisionSubtitle}</p>
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
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
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
    <section className={`booking-detail-card ${BOOKING_CARD}`}>
      <div className="border-b border-brand-200/60 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-brand-950">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p> : null}
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
    <div className="grid gap-1 border-b border-brand-100 py-3 last:border-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd
        className={`text-sm sm:col-span-2 ${highlight ? "font-semibold text-brand-950" : "font-medium text-stone-700"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function CallQualityScorePanel({
  score,
  reasoning,
}: {
  score: number;
  reasoning?: string;
}) {
  const tone =
    score >= 85
      ? "text-emerald-600 ring-emerald-200 bg-emerald-50"
      : score >= 65
        ? "text-amber-600 ring-amber-200 bg-amber-50"
        : "text-rose-600 ring-rose-200 bg-rose-50";

  return (
    <section className="booking-detail-card border-2 border-brand-100">
      <div className="px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          AI call handling score
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <p className="text-4xl font-bold tabular-nums tracking-tight text-brand-950">
            {score}
            <span className="text-lg font-semibold text-slate-500"> / 100</span>
          </p>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>
            {score >= 85 ? "Excellent" : score >= 65 ? "Good" : "Needs review"}
          </span>
        </div>
        {reasoning ? <p className="mt-3 text-sm text-stone-600">{reasoning}</p> : null}
      </div>
    </section>
  );
}

function QuoteEstimateCard({
  bookingId,
  job,
  onSaved,
}: {
  bookingId: string;
  job: JobCard;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(
    job.quotedAmountCents ? (job.quotedAmountCents / 100).toFixed(0) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter an amount.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/jobs/quote", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bookingId, quotedAmountCents: Math.round(dollars * 100) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <InfoCard
      title="Quote / estimate"
      subtitle={
        job.quotedAt
          ? `Sent on ${new Date(job.quotedAt).toLocaleDateString()} — if the job is not booked, the customer gets an automatic follow-up text in 3 days.`
          : "Enter an amount to send an automatic follow-up text in 3 days if the job is still not booked."
      }
    >
      <div className="flex items-center gap-2 py-3">
        <span className="text-sm text-stone-500">$</span>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          placeholder="4500"
          className="w-32 rounded-lg border border-brand-200 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? <p className="pb-3 text-xs text-rose-700">{error}</p> : null}
    </InfoCard>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
      {text}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-5">
      <div className={`booking-detail-hero h-40 ${BOOKING_HERO}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`booking-detail-card h-56 ${BOOKING_CARD}`} />
        <div className={`booking-detail-card h-56 ${BOOKING_CARD}`} />
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  const t = dashboardUi.bookingDetail;
  return (
    <div className="vow-dash-card mt-6 px-6 py-10 text-center">
      <p className="font-semibold text-rose-700">{t.loadFailed}</p>
      <p className="mt-1 text-sm text-rose-600">{message}</p>
    </div>
  );
}

function NotFoundPanel() {
  const t = dashboardUi.bookingDetail;
  return (
    <div className="vow-dash-card mt-6 px-6 py-12 text-center">
      <p className="font-semibold text-brand-950">{t.notFoundTitle}</p>
      <p className="mt-2 text-sm text-stone-600">{t.notFoundBody}</p>
      <Link
        href="/dashboard/bookings"
        className="mt-4 inline-block text-sm font-semibold text-brand-800 hover:underline"
      >
        {t.viewAll}
      </Link>
    </div>
  );
}
