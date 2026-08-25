"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useSilentFetch } from "@/toss-shop/lib/hooks/use-silent-fetch";
import { JARVIS_NAME } from "@/toss-shop/lib/seller-engine/jarvis-engine";
import { envFixHintForCheck } from "@/toss-shop/lib/seller-engine/jarvis-config";
import { SP_ROUTES } from "@/toss-shop/lib/routes";
import type {
  JarvisAutopilotReport,
  JarvisFulfillmentJob,
  JarvisHealthReport,
} from "@/toss-shop/lib/types";

function HealthBadge({ score }: { score: number }) {
  const cls =
    score >= 90 ? "bg-emerald-100 text-emerald-800" : score >= 75 ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{score}%</span>;
}

function FulfillmentJobRow({ job }: { job: JarvisFulfillmentJob }) {
  return (
    <div className="rounded-lg bg-white/60 px-3 py-2 text-xs ring-1 ring-violet-100">
      <p className="font-bold text-violet-950">{job.productName}</p>
      <p className="text-violet-800/80">
        {job.customer.name} · {job.quantity}개 · {job.status}
      </p>
      {job.domemeOrderNote && <p className="mt-1 text-[11px] text-violet-700">{job.domemeOrderNote}</p>}
      {job.supplierUrl && (
        <a href={job.supplierUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-ts-primary underline">
          {job.wholesalePlatform === "domeggook" ? "도매꾹" : job.itemNo ? "도매매" : job.wholesalePlatform ?? "공급처"} 발주 →
        </a>
      )}
    </div>
  );
}

export function JarvisCommandCenter() {
  const [health, setHealth] = useState<JarvisHealthReport | null>(null);
  const [autopilot, setAutopilot] = useState<JarvisAutopilotReport | null>(null);
  const [jobs, setJobs] = useState<JarvisFulfillmentJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [showBacklog, setShowBacklog] = useState(false);
  const [backlogCopied, setBacklogCopied] = useState(false);

  async function copyBacklog(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setBacklogCopied(true);
      setTimeout(() => setBacklogCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없는 브라우저 — 조용히 무시, 목록은 화면에 이미 보인다
    }
  }

  const fetchData = useCallback(async () => {
    const [h, a, f] = await Promise.all([
      fetch("/api/toss-shop/jarvis/health").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/toss-shop/jarvis/autopilot").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/toss-shop/fulfillment").then((r) => (r.ok ? r.json() : null)),
    ]);
    setHealth((h as { report?: JarvisHealthReport })?.report ?? null);
    setAutopilot((a as { report?: JarvisAutopilotReport })?.report ?? null);
    setJobs((f as { jobs?: JarvisFulfillmentJob[] })?.jobs ?? []);
  }, []);

  const { initialLoading } = useSilentFetch(fetchData);

  async function runAutopilot() {
    setBusy(true);
    try {
      const res = await fetch("/api/toss-shop/jarvis/autopilot", { method: "POST" });
      if (res.ok) {
        const json = (await res.json()) as { report?: JarvisAutopilotReport };
        setAutopilot(json.report ?? null);
        await fetchData();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-5 text-white shadow-xl ring-1 ring-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">{JARVIS_NAME} Command Center</p>
          <h2 className="mt-1 text-lg font-bold">아이언맨급 사업 AI · Full Autopilot</h2>
          <p className="mt-1 text-sm text-violet-200/80">
            시장·경쟁·소싱·등록·광고·발주·송장 — 60초마다 자동 실행
          </p>
        </div>
        {health && <HealthBadge score={health.score} />}
      </div>

      {initialLoading ? (
        <div className="mt-4 ts-skeleton h-24 rounded-xl bg-white/10" />
      ) : (
        <>
          {health && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-violet-100">{health.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {health.chatPromises.map((p) => (
                  <span
                    key={p.topic}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.status === "ok"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : p.status === "needs_api"
                          ? "bg-red-500/20 text-red-200"
                          : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {p.status === "ok" ? "✓" : "○"} {p.topic}
                  </span>
                ))}
              </div>
              {health.failedIds.length > 0 && (
                <div className="mt-3 rounded-xl bg-white/5 p-3 ring-1 ring-amber-400/30">
                  <p className="text-xs font-bold text-amber-200">설정 필요 ({health.failedIds.length})</p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-violet-100/90">
                    {health.checks
                      .filter((c) => !c.passed)
                      .map((c) => (
                        <li key={c.id}>
                          <span className="font-semibold text-amber-100">{c.label}</span>
                          {envFixHintForCheck(c.id) && (
                            <span className="block text-violet-200/80">→ {envFixHintForCheck(c.id)}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                  <Link
                    href={`${SP_ROUTES.settings}#api`}
                    className="mt-2 inline-block text-[11px] font-bold text-violet-300 underline"
                  >
                    설정 → API 연동
                  </Link>
                </div>
              )}
            </div>
          )}

          {autopilot && (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] text-violet-300">인증 SKU</p>
                <p className="text-lg font-bold">{autopilot.stats.certifiedSkus}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] text-violet-300">OK 대기</p>
                <p className="text-lg font-bold">{autopilot.stats.pendingReview}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] text-violet-300">등록됨</p>
                <p className="text-lg font-bold">{autopilot.stats.published}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-3 py-2">
                <p className="text-[10px] text-violet-300">발주 대기</p>
                <p className="text-lg font-bold">{autopilot.stats.fulfillmentActive}</p>
              </div>
            </div>
          )}

          {autopilot?.nextSteps && (
            <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs text-violet-100/90">
              {autopilot.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}

          {/*
            반품지 등록은 토스가 생성 API를 열어두지 않아 사람이 해야 하는
            유일한 작업이다. 그래서 다른 안내와 섞지 않고 따로, 눈에 띄게 띄운다.
            한 번 등록하면 그 공급처는 영구히 자동 처리된다.
          */}
          {autopilot?.returnProvisioning && (
            <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-400/10 p-3">
              <p className="text-xs font-bold text-amber-200">
                반품지 등록 필요 ({autopilot.returnProvisioning.asks.length}곳)
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-100/90">
                {autopilot.returnProvisioning.summary}
              </p>
              <div className="mt-2 space-y-2">
                {autopilot.returnProvisioning.asks.map((a) => (
                  <div key={a.supplier} className="rounded-lg bg-black/20 p-2">
                    <p className="font-mono text-[11px] text-amber-100">{a.name}</p>
                    <p className="mt-0.5 text-[11px] text-amber-100/80">{a.address}</p>
                    <p className="mt-0.5 text-[10px] text-amber-200/70">
                      막힌 상품 {a.blockedCount}건
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-amber-200/70">
                토스 셀러센터 → 판매자정보 → 배송/교환/반품 정보에서 위 주소를 그대로 등록하면
                자비스가 다음 사이클에 자동 연결합니다 (이름은 붙일 수 없습니다).
              </p>
            </div>
          )}

          {/*
            오늘의 추천(위) 대신 "한 번에 몰아서 다 등록하고 싶다"는 사장님을 위한
            누적 전체 목록. 이걸 다 등록하면 반품 비용 차감이 완전히 0으로 수렴한다
            — 등록 API가 없는 이상 이게 유일한 실제 방법이다.
          */}
          {autopilot?.returnAddressBacklog && autopilot.returnAddressBacklog.count > 0 && (
            <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3">
              <button
                type="button"
                onClick={() => setShowBacklog((v) => !v)}
                className="flex w-full items-center justify-between text-left text-xs font-bold text-violet-100"
              >
                <span>반품지 미등록 전체 목록 ({autopilot.returnAddressBacklog.count}곳) — 한 번에 몰아서 등록</span>
                <span className="text-violet-300">{showBacklog ? "접기 ▲" : "펼치기 ▼"}</span>
              </button>
              {showBacklog && (
                <>
                  <p className="mt-2 text-[11px] leading-relaxed text-violet-200/80">
                    오늘의 추천 3곳과 달리 상한이 없습니다. 이 목록을 전부 등록하면 그 순간부터
                    이 공급처들의 반품 비용 차감이 0원으로 바뀝니다.
                  </p>
                  <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                    {autopilot.returnAddressBacklog.items.map((item) => (
                      <div key={item.supplier} className="rounded-lg bg-black/20 p-2">
                        <p className="text-[11px] text-violet-100">{item.address}</p>
                        <p className="mt-0.5 text-[10px] text-violet-300/70">
                          막힌 상품 {item.blockedCount}건
                          {item.monthlyValueKrw > 0 ? ` · 월 기여 약 ${item.monthlyValueKrw.toLocaleString()}원` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyBacklog(autopilot.returnAddressBacklog!.instructions)}
                    className="mt-2 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-400"
                  >
                    {backlogCopied ? "복사됨 ✓" : "전체 주소 복사"}
                  </button>
                </>
              )}
            </div>
          )}

          {jobs.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-violet-200">발주함 ({jobs.length})</p>
              {jobs.slice(0, 3).map((j) => (
                <FulfillmentJobRow key={j.id} job={j} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAutopilot()}
          className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {busy ? "Jarvis 실행 중…" : "Jarvis 지금 실행"}
        </button>
        <Link href={SP_ROUTES.listings} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">
          등록함 →
        </Link>
        <Link href={SP_ROUTES.consignment} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20">
          위탁 AI →
        </Link>
      </div>
    </section>
  );
}
