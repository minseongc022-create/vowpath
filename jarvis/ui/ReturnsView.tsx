"use client";

/**
 * 반품 화면 — 자비스가 이미 내린 판정을 확인하는 곳
 *
 * ★ "무엇을 할지 정하세요"가 아니라 "이렇게 처리했습니다"
 *
 * 반품은 응답 기한이 있는 일이다. 화면을 열어봐야 판정이 나오는 구조면
 * 사장님이 안 여는 동안 기한이 지나간다. 그래서 접수되는 즉시 판정하고,
 * 여기서는 그 결과와 **근거**를 보여준다.
 *
 * ★ 두 종류가 다르게 보여야 한다
 *
 *   자동 승인    → 이미 끝난 일. 확인만 하면 된다.
 *   확인 필요    → 사장님이 결정해야 할 일. 왜 자비스가 못 정했는지가 붙는다.
 *
 * 둘을 같은 모양으로 보여주면 급한 것과 안 급한 것이 섞여, 결국 둘 다
 * 안 보게 된다.
 */

import { useCallback, useEffect, useState } from "react";
import { JV_API } from "../routes";
import type { ReturnCase } from "../core/types";
import { RETURN_REASON_LABELS } from "../returns/rules";

export function ReturnsView() {
  const [cases, setCases] = useState<ReturnCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(JV_API.returns);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { returns?: ReturnCase[] };
      setCases(data.returns ?? []);
      setError(null);
    } catch {
      setError("불러오지 못했습니다. 새로고침해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = useCallback(async (caseId: string) => {
    setBusyId(caseId);
    try {
      const res = await fetch(JV_API.returns, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", caseId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCases((list) =>
        list.map((c) => (c.id === caseId ? { ...c, status: "resolved" as const } : c)),
      );
    } catch {
      setError("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusyId(null);
    }
  }, []);

  const open = cases.filter((c) => c.status === "open");

  if (loading) return <p className="jv-muted">불러오는 중…</p>;

  return (
    <div>
      <div className="jv-head">
        <span>반품</span>
        <span className="jv-muted">
          {open.length ? `처리할 반품 ${open.length}건` : "처리할 반품 없음"}
        </span>
      </div>

      {error && <div className="jv-err">{error}</div>}

      {!cases.length && (
        <p className="jv-muted">
          아직 접수된 반품이 없습니다. 반품이 들어오면 자비스가 법정 기준과 공급처 규정에 맞춰
          바로 판정하고 여기에 올립니다.
        </p>
      )}

      {cases.map((c) => (
        <ReturnCard
          key={c.id}
          item={c}
          busy={busyId === c.id}
          onResolve={() => void resolve(c.id)}
        />
      ))}

      <style jsx>{`
        .jv-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px; font-size: 15px; font-weight: 700;
        }
        .jv-muted { color: #6b7280; font-size: 14px; font-weight: 500; line-height: 1.7; }
        .jv-err {
          background: #fff0f0; color: var(--jv-red); border-radius: 12px;
          padding: 12px 14px; font-size: 14px; margin-bottom: 14px;
        }
      `}</style>
    </div>
  );
}

function ReturnCard({
  item,
  busy,
  onResolve,
}: {
  item: ReturnCase;
  busy: boolean;
  onResolve: () => void;
}) {
  const d = item.decision;
  const needsOwner = d.action === "needs_owner";

  return (
    <article className={`jv-rc ${needsOwner ? "jv-rc-warn" : ""}`}>
      <div className="jv-rc-top">
        <span className={`jv-tag ${needsOwner ? "jv-tag-warn" : "jv-tag-ok"}`}>
          {needsOwner ? "사장님 확인 필요" : "자비스가 처리함"}
        </span>
        {item.status === "resolved" && <span className="jv-tag jv-tag-done">마무리됨</span>}
      </div>

      <h3>{RETURN_REASON_LABELS[item.request.reason]}</h3>

      <div className="jv-grid">
        <div>
          <span>환불</span>
          <b>{d.refundKrw.toLocaleString()}원</b>
        </div>
        <div>
          <span>배송비</span>
          <b>{d.shippingBearer === "seller" ? "판매자 부담" : "고객 부담"}</b>
        </div>
        <div>
          <span>회수</span>
          <b>{d.shipBackTo === "supplier" ? "공급처로" : "판매자가"}</b>
        </div>
        <div>
          <span>응답 기한</span>
          <b>{new Date(d.respondByIso).toLocaleString("ko-KR")}</b>
        </div>
      </div>

      {d.deductions.length > 0 && (
        <ul className="jv-ded">
          {d.deductions.map((x, i) => (
            <li key={i}>
              {x.label} −{x.krw.toLocaleString()}원
            </li>
          ))}
        </ul>
      )}

      <p className="jv-do">{d.supplierAction}</p>

      {/* 근거를 항상 보여준다 — 왜 이렇게 처리했는지 설명할 수 없으면
          사장님이 고객에게 답할 수도, 공급처와 다툴 수도 없다 */}
      <ul className="jv-why">
        {d.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      {item.status === "open" && (
        <button type="button" className="jv-done" onClick={onResolve} disabled={busy}>
          {busy ? "처리 중…" : "처리 완료로 표시"}
        </button>
      )}

      <style jsx>{`
        .jv-rc {
          border: 1px solid var(--jv-line); border-radius: 18px;
          padding: 18px; margin-bottom: 16px; background: #fff;
        }
        .jv-rc-warn { border-color: #f5c26b; background: #fffdf7; }
        .jv-rc-top { display: flex; gap: 6px; margin-bottom: 10px; }
        .jv-tag {
          font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 999px;
        }
        .jv-tag-ok { background: #e8f3ff; color: var(--jv-blue); }
        .jv-tag-warn { background: #fff3d6; color: #7a5200; }
        .jv-tag-done { background: var(--jv-surface); color: #6b7280; }
        h3 { font-size: 17px; font-weight: 700; margin: 0 0 14px; }
        .jv-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
          margin-bottom: 12px;
        }
        .jv-grid span { display: block; font-size: 12px; color: #6b7280; margin-bottom: 3px; }
        .jv-grid b { font-size: 15px; font-weight: 700; }
        .jv-ded {
          margin: 0 0 12px; padding-left: 18px; font-size: 13px; color: #6b7280;
        }
        .jv-do {
          background: var(--jv-surface); border-radius: 12px; padding: 12px 14px;
          font-size: 14px; margin: 0 0 12px; line-height: 1.6;
        }
        .jv-why { list-style: none; margin: 0; padding: 0; }
        .jv-why li {
          position: relative; padding: 5px 0 5px 14px; font-size: 13px;
          color: #4b5563; line-height: 1.65;
        }
        .jv-why li::before { content: "·"; position: absolute; left: 3px; }
        .jv-done {
          margin-top: 14px; width: 100%; border: 1px solid var(--jv-line);
          background: #fff; border-radius: 12px; padding: 12px;
          font-size: 15px; font-weight: 700; cursor: pointer;
        }
        .jv-done:disabled { opacity: 0.5; cursor: default; }
      `}</style>
    </article>
  );
}
