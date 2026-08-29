"use client";

/**
 * 검수 화면 — 올리기 전에 고객이 볼 모습 그대로 확인하는 곳
 *
 * ★ 왜 미리보기를 실제 상품 페이지처럼 만드는가
 *
 * 숫자만 나열하면 "판매가 27,195,670원"이 그냥 한 줄로 지나간다. 실제 상품
 * 페이지 모양으로 보여주면 **이상한 게 눈에 걸린다.** 검수의 목적은 정보를
 * 나열하는 게 아니라 사장님이 이상한 걸 알아채게 하는 것이다.
 *
 * ★ 돈 이야기는 접어둔다
 *
 * 원가·마진은 사장님만 보는 값이라 고객 미리보기와 섞이면 안 된다.
 * 그래서 미리보기는 고객 화면 그대로 두고, 셀러 정보는 아래에 따로 둔다.
 */

import { useCallback, useEffect, useState } from "react";
import { JV_API } from "../routes";
import type { Draft } from "../core/types";
import { renderSections, SECTION_LABELS, type SectionKind } from "../engine/detail-page";

export function ReviewView() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 승인 직전 공급처를 다시 확인해 값이 바뀌었을 때 — 오류가 아니라 알림이다 */
  const [notice, setNotice] = useState<string | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(JV_API.drafts);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { drafts?: Draft[]; published?: number };
      setDrafts(data.drafts ?? []);
      setPublishedCount(data.published ?? 0);
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

  const act = useCallback(
    async (draftId: string, action: "approve" | "reject") => {
      setBusyId(draftId);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(JV_API.drafts, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, draftId }),
        });
        const data = (await res.json()) as {
          reason?: string;
          supplierChanged?: boolean;
          supplierNote?: string;
        };
        if (!res.ok) {
          // 게이트가 막았으면 그 이유를 그대로 보여준다 — 왜 승인이 안 되는지
          // 모르면 사장님은 같은 버튼을 계속 누른다
          setError(data.reason ?? "처리하지 못했습니다.");
          await load();
          return;
        }
        // 승인 직전 공급처가 바뀌어 가격을 다시 정했다면 반드시 말해준다 —
        // 조용히 넘기면 사장님이 승인한 가격과 실제로 올라간 가격이 다르다
        if (data.supplierChanged && data.supplierNote) {
          setNotice(data.supplierNote);
        }
        setDrafts((d) => d.filter((x) => x.id !== draftId));
      } catch {
        setError("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const discardAll = useCallback(async () => {
    if (!window.confirm("검수 대기 중인 상품을 전부 비웁니다. 이미 올라간 상품은 그대로 둡니다.")) {
      return;
    }
    setBusyId("all");
    try {
      await fetch(JV_API.drafts, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard_all" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }, [load]);

  if (loading) return <div className="jv-empty">불러오는 중…</div>;

  if (!drafts.length) {
    return (
      <div className="jv-empty">
        <p>검수할 상품이 없습니다.</p>
        <p style={{ fontSize: 14, marginTop: 6 }}>
          지금까지 {publishedCount}건 등록했습니다.
          <br />
          자비스가 10분마다 도매를 훑고 있으니, 기준을 넘는 상품이 나오면 여기에 올라옵니다.
        </p>
      </div>
    );
  }

  return (
    <div className="jv-review">
      <div className="jv-review-head">
        <span>{drafts.length}건 확인 대기</span>
        <button
          type="button"
          className="jv-btn jv-btn-danger"
          onClick={() => void discardAll()}
          disabled={busyId !== null}
          style={{ padding: "8px 12px", fontSize: 13 }}
        >
          전부 비우기
        </button>
      </div>

      {error && <div className="jv-review-error">{error}</div>}
      {notice && <div className="jv-review-notice">{notice}</div>}

      {drafts.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          busy={busyId === draft.id}
          onApprove={() => void act(draft.id, "approve")}
          onReject={() => void act(draft.id, "reject")}
          onRevised={(updated, note) => {
            setDrafts((d) => d.map((x) => (x.id === updated.id ? updated : x)));
            setNotice(note);
          }}
        />
      ))}

      <style jsx>{`
        .jv-review { padding: 18px; }
        .jv-review-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px; font-size: 15px; font-weight: 700;
        }
        .jv-review-error {
          background: #fff0f0; color: var(--jv-red); border-radius: 12px;
          padding: 12px 14px; font-size: 14px; margin-bottom: 14px; line-height: 1.6;
        }
        /* 오류가 아니라 알림 — 승인은 됐는데 값이 바뀌어 다시 정했다는 뜻이라
           빨간색으로 보여주면 실패한 줄 안다 */
        .jv-review-notice {
          background: #fff8e6; color: #7a5200; border-radius: 12px;
          padding: 12px 14px; font-size: 14px; margin-bottom: 14px; line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  busy,
  onApprove,
  onReject,
  onRevised,
}: {
  draft: Draft;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRevised: (draft: Draft, note: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const c = draft.candidate;

  // ★ 고칠 수 있는 단위로 나눠 그린다.
  //
  // 상세페이지를 HTML 한 덩어리로 넣으면 사장님이 "이 부분"을 짚을 방법이
  // 없다. 초안이 들고 있는 **내용**에서 섹션을 다시 그려, 각 섹션 옆에
  // 「이 부분 고치기」를 붙인다. 옛 초안(내용이 없는 것)은 예전처럼
  // 통째로 보여준다 — 고치진 못해도 검수는 돼야 한다.
  const sections = draft.pageCopy ? renderSections(draft.pageCopy).sections : null;

  return (
    <article className="jv-card">
      {/* ── 고객이 보는 모습 ── */}
      <div className="jv-preview">
        <div className="jv-preview-tag">고객이 보는 화면</div>
        {c.supplier.imageUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="jv-preview-img" src={c.supplier.imageUrls[0]} alt={c.title} />
        )}
        <div className="jv-preview-body">
          <h3>{c.title}</h3>
          <div className="jv-price">{c.priceKrw.toLocaleString()}원</div>
          <button type="button" className="jv-fake-buy" disabled>
            구매하기
          </button>
        </div>
      </div>

      <button type="button" className="jv-toggle" onClick={() => setShowDetail((v) => !v)}>
        {showDetail ? "상세페이지 접기" : "상세페이지 보기"}
      </button>

      {showDetail &&
        (sections ? (
          <div className="jv-detail-frame">
            {sections.map((section) => (
              <SectionBlock
                key={section.kind}
                draftId={draft.id}
                kind={section.kind}
                html={section.html}
                onRevised={onRevised}
              />
            ))}
          </div>
        ) : (
          <div
            className="jv-detail-frame"
            // 상세페이지는 우리 엔진이 만든 HTML이다. 공급처에서 온 문자열은
            // 전부 escapeHtml을 거쳐 들어가므로 여기서 다시 정제하지 않는다.
            dangerouslySetInnerHTML={{ __html: draft.detailHtml }}
          />
        ))}

      {/* ── 사장님만 보는 숫자 ── */}
      <div className="jv-seller">
        <div className="jv-seller-grid">
          <div>
            <span>원가</span>
            <b>{c.supplier.landedCostKrw.toLocaleString()}원</b>
          </div>
          <div>
            <span>팔면 남는 돈</span>
            <b className="jv-good">{c.netProfitKrw.toLocaleString()}원</b>
          </div>
          <div>
            <span>실마진</span>
            <b>{c.marginPct}%</b>
          </div>
          <div>
            <span>적자선</span>
            <b>{c.priceFloorKrw.toLocaleString()}원</b>
          </div>
        </div>
        <ul className="jv-checklist">
          {draft.checklist.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="jv-actions">
        <button type="button" className="jv-btn jv-btn-ghost" onClick={onReject} disabled={busy}>
          반려
        </button>
        <button type="button" className="jv-btn jv-btn-primary" onClick={onApprove} disabled={busy}>
          {busy ? "처리 중…" : "승인하고 등록"}
        </button>
      </div>

      <style jsx>{`
        .jv-card {
          border: 1px solid var(--jv-line); border-radius: 18px;
          overflow: hidden; margin-bottom: 20px; background: #fff;
        }
        .jv-preview { position: relative; }
        .jv-preview-tag {
          position: absolute; top: 12px; left: 12px; z-index: 2;
          background: rgba(0, 0, 0, 0.62); color: #fff; font-size: 11px;
          font-weight: 700; padding: 5px 9px; border-radius: 999px;
        }
        .jv-preview-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; background: var(--jv-surface); }
        .jv-preview-body { padding: 16px 18px 18px; }
        .jv-preview-body h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; line-height: 1.45; }
        .jv-price { font-size: 23px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 14px; }
        .jv-fake-buy {
          width: 100%; border: 0; border-radius: 12px; background: var(--jv-blue);
          color: #fff; font-size: 16px; font-weight: 700; padding: 14px;
          opacity: 0.55; font-family: inherit;
        }
        .jv-toggle {
          width: 100%; border: 0; border-top: 1px solid var(--jv-line);
          background: var(--jv-surface); padding: 12px; font-size: 14px;
          font-weight: 600; color: var(--jv-muted); cursor: pointer; font-family: inherit;
        }
        .jv-detail-frame { border-top: 1px solid var(--jv-line); padding: 18px; max-height: 520px; overflow-y: auto; }
        .jv-seller { border-top: 1px solid var(--jv-line); padding: 16px 18px; background: var(--jv-surface); }
        .jv-seller-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .jv-seller-grid div { display: flex; flex-direction: column; gap: 3px; }
        .jv-seller-grid span { font-size: 12px; color: var(--jv-muted); font-weight: 600; }
        .jv-seller-grid b { font-size: 16px; font-weight: 700; }
        .jv-good { color: var(--jv-green); }
        .jv-checklist { list-style: none; margin: 0; padding: 0; }
        .jv-checklist li {
          font-size: 13px; color: var(--jv-muted); line-height: 1.6;
          padding: 5px 0 5px 14px; position: relative;
        }
        .jv-checklist li::before { content: "·"; position: absolute; left: 3px; }
        .jv-actions { display: flex; gap: 10px; padding: 14px 18px 18px; }
        .jv-actions :global(button) { flex: 1; }
        .jv-actions :global(button.jv-btn-primary) { flex: 2; }
      `}</style>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────

/**
 * 상세페이지 한 조각 + 「이 부분 고치기」.
 *
 * 사장님 요구는 "내가 맘에 안 드는 곳 있으면 그 부분만 클릭해서 이거
 * 고쳐달라고 하면 고쳐주게"였다. 그래서 고치는 단위가 곧 보이는 단위여야
 * 한다 — 화면에서 짚은 자리와 자비스가 고치는 자리가 같아야 한다.
 */
function SectionBlock({
  draftId,
  kind,
  html,
  onRevised,
}: {
  draftId: string;
  kind: SectionKind;
  html: string;
  onRevised: (draft: Draft, note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!request.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(JV_API.drafts, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revise", draftId, section: kind, request }),
      });
      const data = (await res.json()) as { reason?: string; draft?: Draft; note?: string };
      if (!res.ok || !data.draft) {
        // 왜 못 고쳤는지 그대로 보여준다 — 이유를 모르면 사장님은 같은 말을
        // 계속 반복하게 된다
        setError(data.reason ?? "고치지 못했습니다.");
        return;
      }
      setRequest("");
      setOpen(false);
      onRevised(data.draft, data.note ?? "고쳤습니다.");
    } catch {
      setError("고치지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }, [draftId, kind, request, onRevised]);

  return (
    <div className="jv-section">
      <div className="jv-section-bar">
        <span className="jv-section-name">{SECTION_LABELS[kind]}</span>
        <button type="button" className="jv-fix-btn" onClick={() => setOpen((v) => !v)}>
          {open ? "닫기" : "이 부분 고치기"}
        </button>
      </div>

      {/* 이 HTML은 우리 엔진이 그린 것이다. 공급처·AI에서 온 문자열은 전부
          escapeHtml을 거쳐 들어가므로 여기서 다시 정제하지 않는다. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />

      {open && (
        <div className="jv-fix">
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="어떻게 고칠까요? (예: 좀 더 짧고 담백하게 / 캠핑에서 쓰는 상황으로 / 이 부분 빼줘)"
            rows={2}
            disabled={busy}
          />
          {error && <p className="jv-fix-error">{error}</p>}
          <button
            type="button"
            className="jv-fix-send"
            onClick={() => void submit()}
            disabled={busy || !request.trim()}
          >
            {busy ? "고치는 중…" : "자비스에게 고쳐달라고 하기"}
          </button>
        </div>
      )}

      <style jsx>{`
        .jv-section { position: relative; border-bottom: 1px dashed var(--jv-line); }
        .jv-section:last-child { border-bottom: 0; }
        .jv-section-bar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 10px; background: var(--jv-surface);
        }
        .jv-section-name { font-size: 12px; font-weight: 700; color: #6b7280; }
        .jv-fix-btn {
          border: 1px solid var(--jv-line); background: #fff; border-radius: 999px;
          font-size: 12px; font-weight: 700; padding: 5px 11px; cursor: pointer;
          color: var(--jv-blue);
        }
        .jv-fix { padding: 10px; background: #f7f8fa; }
        .jv-fix textarea {
          width: 100%; border: 1px solid var(--jv-line); border-radius: 10px;
          padding: 10px; font-size: 14px; line-height: 1.5; resize: vertical;
          font-family: inherit;
        }
        .jv-fix-error { color: var(--jv-red); font-size: 13px; margin: 8px 0 0; line-height: 1.6; }
        .jv-fix-send {
          margin-top: 8px; width: 100%; border: 0; border-radius: 10px;
          background: var(--jv-blue); color: #fff; font-size: 14px; font-weight: 700;
          padding: 11px; cursor: pointer;
        }
        .jv-fix-send:disabled { opacity: 0.5; cursor: default; }
      `}</style>
    </div>
  );
}
