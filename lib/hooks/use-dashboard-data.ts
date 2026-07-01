"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RequestStatus } from "@/lib/booking-policy";
import { parseDateInput } from "@/lib/dashboard-analytics";
import { safeDashboardFetch } from "@/lib/dashboard-fetch";
import type { CustomerVerificationRecord } from "@/lib/customer-verification/types";
import type { TenantEvent } from "@/lib/tenant-events";
import type { JobCard } from "@/lib/types";
import type { JobberBookingRecord } from "@/lib/jobber-bookings";
import {
  ensureTenantLocalCache,
  type CallRecord,
} from "@/lib/dashboard-data-client";
import {
  readDashboardSnapshot,
  writeDashboardSnapshot,
} from "@/lib/dashboard-snapshot-cache";
import { useDashboardUi } from "@/components/providers/LocaleProvider";
import { clearTenantLocalCache } from "@/lib/dashboard-data-client";

export type DashboardDateRange = {
  start: string;
  end: string;
};

type DashboardDataSource = {
  heroCalls: CallRecord[];
  heroJobs: JobCard[];
  heroJobberBookings: JobberBookingRecord[];
  tenantEvents: TenantEvent[];
  jobberConnected: boolean;
  jobberAccountName: string | null;
  jobberError: string | null;
  jobberSyncedAt: string | null;
  requestStatuses: Record<string, RequestStatus>;
  statusError: string | null;
  error: string | null;
  /** True until the first fetch attempt finishes (success or failure). */
  loading: boolean;
  /** True after at least one fetch attempt completed. */
  hasLoaded: boolean;
  /** True while a manual or event-driven refresh is in flight. */
  refreshing: boolean;
  refresh: () => Promise<void>;
  patchRequestStatuses: (statuses: Record<string, RequestStatus>) => void;
  customerVerifications: CustomerVerificationRecord[];
};

const DashboardDataContext = createContext<DashboardDataSource | null>(null);

/** Local calendar date (YYYY-MM-DD) — avoids UTC off-by-one vs the user's timezone. */
function localIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function oneYearAgoIsoDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return localIsoDate(d);
}

function todayIsoDate() {
  return localIsoDate();
}

function resolveHeroQueryRange() {
  return {
    start: oneYearAgoIsoDate(),
    end: todayIsoDate(),
  };
}

function rangeStartMs(start: string): number {
  return parseDateInput(start)?.getTime() ?? 0;
}

function rangeEndMs(end: string): number {
  const d = parseDateInput(end);
  if (!d) return Date.now();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function filterByDateRange<T extends { createdAt: string }>(
  items: T[],
  start: string,
  end: string,
): T[] {
  const s = rangeStartMs(start);
  const e = rangeEndMs(end);
  return items.filter((item) => {
    const t = new Date(item.createdAt).getTime();
    return t >= s && t <= e;
  });
}

function filterJobsByRange(jobs: JobCard[], start: string, end: string): JobCard[] {
  const s = rangeStartMs(start);
  const e = rangeEndMs(end);
  return jobs.filter((job) => {
    const t = new Date(job.createdAt ?? 0).getTime();
    return t >= s && t <= e;
  });
}

/** SSR-safe defaults — never start in a blocking loading state after hydration. */
const SSR_DASHBOARD_BOOT = {
  heroCalls: [] as CallRecord[],
  heroJobs: [] as JobCard[],
  requestStatuses: {} as Record<string, RequestStatus>,
  loading: false,
  hasLoaded: false,
  hasLoadedRef: false,
};

function readClientDashboardBoot() {
  const snapshot = readDashboardSnapshot();
  const hasSeed = Boolean(snapshot);
  return {
    heroCalls: snapshot?.heroCalls ?? [],
    heroJobs: snapshot?.heroJobs ?? [],
    requestStatuses: snapshot?.requestStatuses ?? {},
    hasSeed,
  };
}

function useDashboardDataSource(): DashboardDataSource {
  const dashboardUi = useDashboardUi();
  const err = dashboardUi.loadErrors;
  const heroRange = useMemo(() => resolveHeroQueryRange(), []);
  const jobberFetchRef = useRef(0);
  const fetchGenRef = useRef(0);
  const [boot] = useState(() => SSR_DASHBOARD_BOOT);
  const hasLoadedRef = useRef(boot.hasLoadedRef);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const refreshInFlightRef = useRef(false);

  const [heroCalls, setHeroCalls] = useState<CallRecord[]>(boot.heroCalls);
  const [heroJobs, setHeroJobs] = useState<JobCard[]>(boot.heroJobs);
  const [heroJobberBookings, setHeroJobberBookings] = useState<JobberBookingRecord[]>([]);
  const [tenantEvents, setTenantEvents] = useState<TenantEvent[]>([]);
  const [jobberConnected, setJobberConnected] = useState(false);
  const [jobberAccountName, setJobberAccountName] = useState<string | null>(null);
  const [jobberError, setJobberError] = useState<string | null>(null);
  const [jobberSyncedAt, setJobberSyncedAt] = useState<string | null>(null);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatus>>(
    boot.requestStatuses,
  );
  const [statusError, setStatusError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(boot.loading);
  const [hasLoaded, setHasLoaded] = useState(boot.hasLoaded);
  const [refreshing, setRefreshing] = useState(false);
  const [customerVerifications, setCustomerVerifications] = useState<
    CustomerVerificationRecord[]
  >([]);

  const heroCallsRef = useRef(heroCalls);
  const heroJobsRef = useRef(heroJobs);
  const heroJobberBookingsRef = useRef(heroJobberBookings);
  const requestStatusesRef = useRef(requestStatuses);
  heroCallsRef.current = heroCalls;
  heroJobsRef.current = heroJobs;
  heroJobberBookingsRef.current = heroJobberBookings;
  requestStatusesRef.current = requestStatuses;

  const storeFetchedData = useCallback(
    (
      allCalls: CallRecord[],
      allJobs: JobCard[],
      allJobber: JobberBookingRecord[],
    ) => {
      setHeroCalls(allCalls);
      setHeroJobs(allJobs);
      setHeroJobberBookings(allJobber);
    },
    [],
  );

  const loadJobberInBackground = useCallback(
    async (heroQ: string, existingCalls: CallRecord[], existingJobs: JobCard[]) => {
      const fetchId = ++jobberFetchRef.current;
      const jobberRes = await safeDashboardFetch(`/api/jobber/bookings?${heroQ}`, 8_000);
      if (fetchId !== jobberFetchRef.current) return;

      let allJobber: JobberBookingRecord[] = [];
      let connected = false;
      let accountName: string | null = null;
      let nextJobberError: string | null = null;
      let syncedAt: string | null = null;

      if (jobberRes?.ok) {
        const data = (await jobberRes.json()) as {
          connected?: boolean;
          accountName?: string | null;
          bookings?: JobberBookingRecord[];
          error?: string;
          syncedAt?: string;
        };
        connected = Boolean(data.connected);
        accountName = data.accountName ?? null;
        allJobber = data.bookings ?? [];
        nextJobberError = data.error ?? null;
        syncedAt = data.syncedAt ?? null;
      } else if (jobberRes) {
        try {
          const data = (await jobberRes.json()) as {
            connected?: boolean;
            accountName?: string | null;
            error?: string;
          };
          connected = Boolean(data.connected);
          accountName = data.accountName ?? null;
          nextJobberError = data.error ?? err.jobberFailed;
        } catch {
          nextJobberError = err.jobberFailed;
        }
      } else {
        nextJobberError = err.jobberTimeout;
      }

      setJobberConnected(connected);
      setJobberAccountName(accountName);
      setJobberError(nextJobberError);
      setJobberSyncedAt(syncedAt);
      storeFetchedData(existingCalls, existingJobs, allJobber);

      // Jobber is optional. A Jobber refresh/auth problem should show as an
      // integration warning, not block the whole dashboard from loading.
    },
    [storeFetchedData],
  );

  const loadSecondaryInBackground = useCallback(
    async (gen: number, heroQ: string, allCalls: CallRecord[], allJobs: JobCard[]) => {
      const [eventsRes, verifyRes, meRes] = await Promise.all([
        safeDashboardFetch("/api/tenant-events?days=14", 6_000),
        safeDashboardFetch("/api/customer-verification", 6_000),
        safeDashboardFetch("/api/me", 5_000),
      ]);
      if (gen !== fetchGenRef.current) return;

      if (meRes?.ok) {
        const meData = (await meRes.json()) as { userId?: string };
        if (meData.userId) ensureTenantLocalCache(meData.userId);
      }

      if (eventsRes?.ok) {
        const eventData = (await eventsRes.json()) as { events?: TenantEvent[] };
        setTenantEvents(eventData.events ?? []);
      }

      if (verifyRes?.ok) {
        const verifyData = (await verifyRes.json()) as {
          records?: CustomerVerificationRecord[];
        };
        setCustomerVerifications(verifyData.records ?? []);
      }

      void loadJobberInBackground(heroQ, allCalls, allJobs);
    },
    [loadJobberInBackground],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    const gen = ++fetchGenRef.current;
    const firstLoad = !hasLoadedRef.current;
    if (firstLoad && heroJobsRef.current.length === 0 && heroCallsRef.current.length === 0) {
      setLoading(true);
    } else if (!firstLoad) {
      setRefreshing(true);
    }
    setError(null);

    const heroQ = `start=${encodeURIComponent(heroRange.start)}&end=${encodeURIComponent(heroRange.end)}`;

    let allCalls = heroCallsRef.current;
    let allJobs = heroJobsRef.current;
    let nextStatuses = requestStatusesRef.current;
    let callsFailed = false;
    let jobsFailed = false;

    try {
      const [callsRes, jobsRes, statusRes] = await Promise.all([
        safeDashboardFetch("/api/calls", 6_000),
        safeDashboardFetch("/api/jobs", 6_000),
        safeDashboardFetch("/api/bookings/status", 5_000),
      ]);

      if (gen !== fetchGenRef.current) {
        refreshInFlightRef.current = false;
        return;
      }

      if (callsRes?.ok) {
        const data = (await callsRes.json()) as { calls?: CallRecord[] };
        allCalls = [...(data.calls ?? [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      } else if (!callsRes || (callsRes.status !== 401 && callsRes.status !== 403)) {
        callsFailed = true;
      }

      if (jobsRes?.ok) {
        const data = (await jobsRes.json()) as { jobs?: JobCard[] };
        allJobs = data.jobs ?? [];
      } else if (!jobsRes) {
        jobsFailed = true;
      } else if (jobsRes.status === 401 || jobsRes.status === 403) {
        allJobs = [];
      } else {
        jobsFailed = true;
      }

      if (statusRes?.ok) {
        const statusData = (await statusRes.json()) as {
          statuses?: Record<string, RequestStatus>;
        };
        nextStatuses = statusData.statuses ?? {};
        setStatusError(null);
      } else if (statusRes?.status === 503) {
        setStatusError(err.statusKv);
      } else if (statusRes && statusRes.status !== 401) {
        setStatusError(err.statusFailed);
      }

      storeFetchedData(allCalls, allJobs, heroJobberBookingsRef.current);
      setRequestStatuses(nextStatuses);
      clearTenantLocalCache();
      writeDashboardSnapshot({
        heroCalls: allCalls,
        heroJobs: allJobs,
        requestStatuses: nextStatuses,
      });

      if (callsFailed && jobsFailed) {
        setError(err.bothFailed);
      } else if (callsFailed) {
        setError(err.callsFailed);
      } else if (jobsFailed) {
        setError(err.jobsFailed);
      }
    } catch {
      if (gen !== fetchGenRef.current) {
        refreshInFlightRef.current = false;
        return;
      }
      allCalls = heroCallsRef.current;
      setError(err.network);
    } finally {
      if (gen === fetchGenRef.current) {
        setLoading(false);
        setRefreshing(false);
        hasLoadedRef.current = true;
        setHasLoaded(true);
        refreshInFlightRef.current = false;
      }
    }

    void loadSecondaryInBackground(gen, heroQ, allCalls, allJobs);
  }, [heroRange.start, heroRange.end, storeFetchedData, loadSecondaryInBackground]);

  refreshRef.current = refresh;

  useEffect(() => {
    const cached = readClientDashboardBoot();
    if (cached.hasSeed) {
      setHeroCalls(cached.heroCalls);
      setHeroJobs(cached.heroJobs);
      setRequestStatuses(cached.requestStatuses);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    }

    void refreshRef.current();

    const onRefresh = () => {
      void refreshRef.current();
    };

    window.addEventListener("effiroad:calls-updated", onRefresh);
    window.addEventListener("effiroad:jobs-updated", onRefresh);
    window.addEventListener("effiroad:jobber-updated", onRefresh);
    window.addEventListener("effiroad:bookings-status-updated", onRefresh);
    window.addEventListener("effiroad:tenant-events-updated", onRefresh);

    const poll =
      typeof document !== "undefined"
        ? window.setInterval(() => {
            if (document.visibilityState === "visible") {
              void refreshRef.current();
            }
          }, 60_000)
        : undefined;

    return () => {
      window.removeEventListener("effiroad:calls-updated", onRefresh);
      window.removeEventListener("effiroad:jobs-updated", onRefresh);
      window.removeEventListener("effiroad:jobber-updated", onRefresh);
      window.removeEventListener("effiroad:bookings-status-updated", onRefresh);
      window.removeEventListener("effiroad:tenant-events-updated", onRefresh);
      if (poll !== undefined) window.clearInterval(poll);
    };
  }, []);

  const patchRequestStatuses = useCallback(
    (statuses: Record<string, RequestStatus>) => {
      setRequestStatuses((prev) => {
        const next = { ...prev, ...statuses };
        writeDashboardSnapshot({
          heroCalls: heroCallsRef.current,
          heroJobs: heroJobsRef.current,
          requestStatuses: next,
        });
        return next;
      });
    },
    [],
  );

  return {
    heroCalls,
    heroJobs,
    heroJobberBookings,
    tenantEvents,
    jobberConnected,
    jobberAccountName,
    jobberError,
    jobberSyncedAt,
    requestStatuses,
    statusError,
    error,
    loading,
    hasLoaded,
    refreshing,
    refresh,
    patchRequestStatuses,
    customerVerifications,
  };
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const value = useDashboardDataSource();
  return createElement(DashboardDataContext.Provider, { value }, children);
}

export function useDashboardData(dateRange?: DashboardDateRange | null) {
  const source = useContext(DashboardDataContext);
  if (!source) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }

  /** `null` = show every loaded row (bookings list / detail). */
  const noDateFilter = dateRange === null;
  const start = noDateFilter ? "" : (dateRange?.start ?? oneYearAgoIsoDate());
  const end = noDateFilter ? "" : (dateRange?.end ?? todayIsoDate());

  const calls = useMemo(
    () =>
      noDateFilter
        ? source.heroCalls
        : filterByDateRange(source.heroCalls, start, end),
    [source.heroCalls, noDateFilter, start, end],
  );
  const jobs = useMemo(
    () =>
      noDateFilter
        ? source.heroJobs
        : filterJobsByRange(source.heroJobs, start, end),
    [source.heroJobs, noDateFilter, start, end],
  );
  const jobberBookings = useMemo(
    () =>
      noDateFilter
        ? source.heroJobberBookings
        : filterByDateRange(source.heroJobberBookings, start, end),
    [source.heroJobberBookings, noDateFilter, start, end],
  );

  return {
    calls,
    jobs,
    jobberBookings,
    heroCalls: source.heroCalls,
    heroJobs: source.heroJobs,
    heroJobberBookings: source.heroJobberBookings,
    tenantEvents: source.tenantEvents,
    jobberConnected: source.jobberConnected,
    jobberAccountName: source.jobberAccountName,
    jobberError: source.jobberError,
    jobberSyncedAt: source.jobberSyncedAt,
    requestStatuses: source.requestStatuses,
    statusError: source.statusError,
    error: source.error,
    loading: source.loading,
    hasLoaded: source.hasLoaded,
    refreshing: source.refreshing,
    refresh: source.refresh,
    patchRequestStatuses: source.patchRequestStatuses,
    customerVerifications: source.customerVerifications,
    queryRange: { start, end },
  };
}
