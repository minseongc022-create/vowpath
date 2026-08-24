"use client";

/**
 * 토스 카테고리·반품지 조회 — 셀러센터를 따로 열지 않고 여기서 실제 ID를 확인한다.
 *
 * ⚠️ 이건 "찾는 것"만 자동화한다. 이 카테고리/반품지가 이 상품에 맞는지,
 * 어떤 반품지를 어느 공급처에 쓸지는 여전히 사람이 판단해서
 * TOSS_SHOP_CATEGORY_ID_MAP / TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP에
 * 직접 넣어야 한다. 여기서 ID를 확인만 하고, 실제 매핑은 Vercel
 * 환경변수에 저장하는 구조는 변하지 않는다.
 */

import { useCallback, useState } from "react";

type CategoryNode = { id: number; name: string; isLeaf: boolean };
type ReturnLocation = { id: number; name: string; address?: string };

function CategoryBrowser() {
  const [stack, setStack] = useState<{ id?: number; label: string }[]>([{ label: "최상위" }]);
  const [nodes, setNodes] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (parentId?: number) => {
    setLoading(true);
    setError("");
    try {
      const qs = parentId !== undefined ? `&parentId=${parentId}` : "";
      const res = await fetch(`/api/toss-shop/toss-lookups?type=categories${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "조회 실패");
      setNodes(json.nodes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function enter(node: CategoryNode) {
    setStack((s) => [...s, { id: node.id, label: node.name }]);
    void load(node.id);
  }

  function goTo(index: number) {
    setStack((s) => s.slice(0, index + 1));
    void load(stack[index]?.id);
  }

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
        {stack.map((s, i) => (
          <span key={i}>
            {i > 0 && " › "}
            <button type="button" onClick={() => goTo(i)} className="underline hover:text-slate-800">
              {s.label}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => void load(stack[stack.length - 1]?.id)}
          className="ml-2 rounded bg-slate-200 px-2 py-0.5 font-semibold text-slate-700"
        >
          {loading ? "조회 중…" : "펼치기"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {nodes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {nodes.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5 text-xs ring-1 ring-slate-100">
              <span className="truncate">
                {n.name} <span className="text-slate-400">#{n.id}</span>
              </span>
              {n.isLeaf ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                  등록 가능 ID: {n.id}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => enter(n)}
                  className="shrink-0 rounded bg-violet-100 px-2 py-0.5 font-semibold text-violet-800"
                >
                  하위 보기 →
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReturnLocationBrowser() {
  const [locations, setLocations] = useState<ReturnLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/toss-shop/toss-lookups?type=return-locations");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "조회 실패");
      setLocations(json.locations ?? []);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => void load()}
        className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
      >
        {loading ? "조회 중…" : "등록된 반품지 불러오기"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {loaded && locations.length === 0 && !error && (
        <p className="mt-2 text-xs text-amber-700">
          등록된 반품지가 없습니다 — 토스 셀러센터에서 먼저 하나 이상 등록해야 합니다.
        </p>
      )}
      {locations.length > 0 && (
        <ul className="mt-2 space-y-1">
          {locations.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5 text-xs ring-1 ring-slate-100">
              <span className="truncate">
                {l.name}
                {l.address && <span className="text-slate-400"> · {l.address}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                ID: {l.id}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TossCategoryReturnLookup() {
  const [tab, setTab] = useState<"category" | "return">("category");

  return (
    <section className="ts-card">
      <h2 className="text-sm font-bold">카테고리·반품지 ID 확인</h2>
      <p className="mt-1 text-xs leading-relaxed text-ts-muted">
        토스 셀러센터를 따로 열지 않고 여기서 실제 ID를 확인할 수 있습니다. 확인한 ID는
        Vercel 환경변수 <code className="text-[11px]">TOSS_SHOP_CATEGORY_ID_MAP</code> /{" "}
        <code className="text-[11px]">TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP</code>에 직접 넣어야
        적용됩니다 — 어떤 카테고리·반품지가 맞는지는 최종적으로 사람이 확인해야 합니다.
      </p>

      <div className="mt-3 flex gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("category")}
          className={`rounded-full px-3 py-1 ${tab === "category" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          카테고리
        </button>
        <button
          type="button"
          onClick={() => setTab("return")}
          className={`rounded-full px-3 py-1 ${tab === "return" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          반품지
        </button>
      </div>

      {tab === "category" ? <CategoryBrowser /> : <ReturnLocationBrowser />}
    </section>
  );
}
