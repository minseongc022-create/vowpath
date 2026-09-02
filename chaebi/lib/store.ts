import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useKvStore } from "@/lib/kv-config";
import type { Plan, PlanSummary } from "./types";

/**
 * 저장소 — KV → 파일 → 메모리 순으로 내려간다.
 *
 * 배포(서버리스)에서는 KV가 유일하게 신뢰할 수 있는 저장소다. 파일시스템은
 * 읽기 전용이고, 메모리는 인스턴스가 바뀌면 사라진다. 그래도 셋 다 두는 건
 * **키가 없어도 앱이 켜지고 끝까지 돌아야 하기 때문**이다 — 로컬에서 처음
 * 켜보는 사람이 KV부터 붙여야 한다면 그 앱은 안 켜본 앱이 된다.
 *
 * 이 계층은 저장소를 감춘다. 위쪽(라우트·엔진)은 어디에 저장되는지 모른다.
 */

const PLAN_TTL_SECONDS = 60 * 60 * 24 * 120; // 120일
const OWNER_PLAN_LIMIT = 60;
const DATA_DIR = join(process.cwd(), ".data", "chaebi");

const memoryPlans = new Map<string, Plan>();
const memoryOwners = new Map<string, string[]>();

/** 파일 쓰기가 한 번 막히면(서버리스 읽기 전용) 그 뒤로는 메모리만 쓴다. */
let fileWritable = true;

function planKey(id: string): string {
  return `chaebi:plan:${id}`;
}

function ownerKey(ownerId: string): string {
  return `chaebi:owner:${ownerId}`;
}

async function kvClient() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

async function fileRead<T>(name: string): Promise<T | null> {
  try {
    const raw = await readFile(join(DATA_DIR, `${name}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function fileWrite(name: string, value: unknown): Promise<boolean> {
  if (!fileWritable) return false;
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, `${name}.json`), JSON.stringify(value), "utf8");
    return true;
  } catch {
    fileWritable = false;
    return false;
  }
}

/** 저장소 종류 — 화면에 "이 기기에만 저장됨" 같은 안내를 정확히 띄우기 위해. */
export function storageMode(): "kv" | "file" | "memory" {
  if (useKvStore()) return "kv";
  return fileWritable ? "file" : "memory";
}

export async function savePlan(plan: Plan): Promise<void> {
  memoryPlans.set(plan.id, plan);

  if (useKvStore()) {
    try {
      const kv = await kvClient();
      await kv.set(planKey(plan.id), plan, { ex: PLAN_TTL_SECONDS });
      await addToOwnerIndex(plan.ownerId, plan.id);
      return;
    } catch {
      // KV가 흔들려도 메모리에는 남아 있으니 이번 요청은 살린다
    }
  }

  await fileWrite(`plan-${plan.id}`, plan);
  await addToOwnerIndex(plan.ownerId, plan.id);
}

export async function loadPlan(id: string): Promise<Plan | null> {
  if (useKvStore()) {
    try {
      const kv = await kvClient();
      const found = await kv.get<Plan>(planKey(id));
      if (found) {
        memoryPlans.set(id, found);
        return found;
      }
    } catch {
      // 아래 폴백으로
    }
  }

  const cached = memoryPlans.get(id);
  if (cached) return cached;

  const fromFile = await fileRead<Plan>(`plan-${id}`);
  if (fromFile) {
    memoryPlans.set(id, fromFile);
    return fromFile;
  }
  return null;
}

async function addToOwnerIndex(ownerId: string, planId: string): Promise<void> {
  const current = await loadOwnerIndex(ownerId);
  const next = [planId, ...current.filter((id) => id !== planId)].slice(0, OWNER_PLAN_LIMIT);
  memoryOwners.set(ownerId, next);

  if (useKvStore()) {
    try {
      const kv = await kvClient();
      await kv.set(ownerKey(ownerId), next, { ex: PLAN_TTL_SECONDS });
      return;
    } catch {
      // 폴백
    }
  }
  await fileWrite(`owner-${ownerId}`, next);
}

async function loadOwnerIndex(ownerId: string): Promise<string[]> {
  if (useKvStore()) {
    try {
      const kv = await kvClient();
      const found = await kv.get<string[]>(ownerKey(ownerId));
      if (Array.isArray(found)) {
        memoryOwners.set(ownerId, found);
        return found;
      }
    } catch {
      // 폴백
    }
  }
  const cached = memoryOwners.get(ownerId);
  if (cached) return cached;

  const fromFile = await fileRead<string[]>(`owner-${ownerId}`);
  if (Array.isArray(fromFile)) {
    memoryOwners.set(ownerId, fromFile);
    return fromFile;
  }
  return [];
}

export function summarize(plan: Plan): PlanSummary {
  const live = plan.items.filter((item) => item.status !== "skipped");
  return {
    id: plan.id,
    headline: plan.brief.headline,
    occasion: plan.brief.occasion,
    dateISO: plan.brief.dateISO,
    status: plan.status,
    totalKrw: plan.totalKrw,
    itemCount: live.length,
    doneCount: live.filter((item) => item.status === "done" || item.status === "confirmed").length,
    updatedAt: plan.updatedAt,
  };
}

export async function listPlans(ownerId: string): Promise<PlanSummary[]> {
  const ids = await loadOwnerIndex(ownerId);
  const plans = await Promise.all(ids.map((id) => loadPlan(id)));
  return plans
    .filter((plan): plan is Plan => Boolean(plan) && plan!.ownerId === ownerId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(summarize);
}

/** 남의 계획을 열지 못하게 — 라우트마다 이걸 통과해야 한다. */
export async function loadOwnedPlan(id: string, ownerId: string): Promise<Plan | null> {
  const plan = await loadPlan(id);
  if (!plan) return null;
  return plan.ownerId === ownerId ? plan : null;
}
