import test from "node:test";
import assert from "node:assert/strict";

// storage.ts / identity.ts are "use client" browser modules guarded by `typeof window`.
// A minimal in-memory localStorage + window stand-in lets us exercise the real scoping logic
// (not a reimplementation of it) outside a browser, the same way jsdom would.
function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    clear: () => { map.clear(); },
  };
}

globalThis.window = { localStorage: makeLocalStorage(), dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} };

const { getOrCreateIdentity } = await import("../../dajeong/lib/identity.ts");
const { savePlan, listPlans, getPlan } = await import("../../dajeong/lib/storage.ts");

function minimalPlan(id, title) {
  return {
    id,
    createdAt: new Date().toISOString(),
    sourceRequest: title,
    situation: { targetDate: "2026-09-10", region: "서울" },
    title,
    summary: title,
    items: [],
    subtotal: 0,
    reserve: 0,
    total: 0,
    budget: 0,
    budgetRemaining: 0,
    readiness: 1,
    status: "draft",
    notice: "",
    revisions: [],
  };
}

function setResolvedIdentity(id) {
  window.localStorage.setItem("dajeong:identity:resolved-id:v1", id);
}

test("[TEST 24] 로컬 저장소: 서로 다른 계정(브라우저 재사용)은 서로의 계획을 못 본다", () => {
  window.localStorage.clear();
  setResolvedIdentity("anon_A");
  savePlan(minimalPlan("plan_secret_A", "A의 비밀 데이트"));
  assert.equal(listPlans().length, 1);
  assert.ok(getPlan("plan_secret_A"));

  // 다른 계정(user_B)이 같은 브라우저에 로그인했다고 가정 — 캐시된 identity가 바뀐다.
  setResolvedIdentity("user_B");
  assert.equal(listPlans().length, 0, "다른 계정으로 로그인하면 이전 사용자의 계획이 목록에 보이면 안 된다");
  assert.equal(getPlan("plan_secret_A"), null, "다른 계정으로 로그인하면 이전 사용자의 계획을 직접 열 수도 없어야 한다");

  // 원래 계정으로 돌아오면 다시 보인다.
  setResolvedIdentity("anon_A");
  assert.equal(listPlans().length, 1);
  assert.ok(getPlan("plan_secret_A"));
});

test("[TEST 25] 로컬 저장소: 로그인 이전에 저장된(레거시) 계획은 그 시점의 익명 기기 ID에만 계속 속한다", () => {
  window.localStorage.clear();
  const anon = getOrCreateIdentity();
  // localOwnerId가 없는 "레거시" 계획을 흉내낸다.
  const legacy = { ...minimalPlan("plan_legacy", "로그인 이전 계획"), localOwnerId: undefined };
  window.localStorage.setItem("dajeong:plans:v1", JSON.stringify([legacy]));

  setResolvedIdentity(anon.id);
  assert.equal(listPlans().length, 1, "레거시 계획은 그 브라우저의 익명 기기 ID에서는 계속 보여야 한다");

  setResolvedIdentity("user_new_account");
  assert.equal(listPlans().length, 0, "레거시 계획이 새로 로그인한 계정에 노출되면 안 된다");
});
