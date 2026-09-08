"use client";

import type { CompanyProfile, Crew, Job, JobStatus } from "./types";

const JOBS_KEY = "jimroute_jobs";
const CREWS_KEY = "jimroute_crews";
const COMPANY_KEY = "jimroute_company";

const DEFAULT_CREWS: Crew[] = [
  {
    id: "crew-1",
    name: "1팀 (김반장)",
    leaderPhone: "010-1234-5678",
    truckSize: "2.5t",
    memberCount: 3,
    active: true,
  },
  {
    id: "crew-2",
    name: "2팀 (이반장)",
    leaderPhone: "010-9876-5432",
    truckSize: "5t",
    memberCount: 4,
    active: true,
  },
];

const DEFAULT_COMPANY: CompanyProfile = {
  name: "행복이사",
  phone: "02-123-4567",
  depositRate: 0.2,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCompany(): CompanyProfile {
  return read(COMPANY_KEY, DEFAULT_COMPANY);
}

export function saveCompany(company: CompanyProfile): void {
  write(COMPANY_KEY, company);
}

export function getCrews(): Crew[] {
  return read(CREWS_KEY, DEFAULT_CREWS);
}

export function saveCrews(crews: Crew[]): void {
  write(CREWS_KEY, crews);
}

export function getJobs(): Job[] {
  return read<Job[]>(JOBS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getJob(id: string): Job | undefined {
  return getJobs().find((j) => j.id === id);
}

export function saveJob(job: Job): void {
  const jobs = getJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.unshift(job);
  write(JOBS_KEY, jobs);
}

export function updateJobStatus(
  id: string,
  status: JobStatus,
  note?: string,
): Job | undefined {
  const job = getJob(id);
  if (!job) return undefined;
  const updated: Job = {
    ...job,
    status,
    statusHistory: [
      ...job.statusHistory,
      { status, at: new Date().toISOString(), note },
    ],
  };
  saveJob(updated);
  return updated;
}

export function assignCrew(jobId: string, crewId: string): Job | undefined {
  const job = getJob(jobId);
  if (!job) return undefined;
  const updated: Job = {
    ...job,
    crewId,
    status: "dispatched",
    statusHistory: [
      ...job.statusHistory,
      {
        status: "dispatched",
        at: new Date().toISOString(),
        note: "팀 배차 완료",
      },
    ],
  };
  saveJob(updated);
  return updated;
}

export function seedDemoJobs(): void {
  if (getJobs().length > 0) return;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const demo: Job = {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    customerName: "박민수",
    customerPhone: "010-5555-1234",
    moveDate: tomorrow.toISOString().slice(0, 10),
    moveType: "semi",
    pyung: 24,
    distanceKm: 18,
    from: {
      line: "서울 강남구 역삼동 123-45",
      floor: 8,
      elevator: "yes",
    },
    to: {
      line: "경기 성남시 분당구 정자동 67-8",
      floor: 3,
      elevator: "no",
    },
    lineItems: [
      { id: "base", label: "반포장이사 (24평 기준)", amount: 2_880_000 },
      { id: "distance", label: "거리 추가 (18km)", amount: 64_000 },
      { id: "to-elevator", label: "도착지 계단 이용", amount: 30_000 },
    ],
    total: 2_974_000,
    deposit: 594_800,
    status: "confirmed",
    notes: "오전 9시 도착 희망",
    statusHistory: [
      { status: "quote", at: now.toISOString() },
      { status: "confirmed", at: now.toISOString(), note: "계약금 입금 확인" },
    ],
  };
  saveJob(demo);
}
