"""Oracle Brain — elite fact-based stock decision engine.

Intelligence stack (3 upgrades on top of base dual-pass):
  L1 Regime pack — market risk-on/off + deadline survival pressure in facts
  L2 Edge ranker — risk-adjusted EV sort + size_hint before LLM
  L3 Survival referee — third adversarial pass when deep / high urgency

Risk veto still absolute for Buy/Add.
"""

from __future__ import annotations

import json
import logging
import threading
from typing import Any, Callable

from oracle.core.types import Action, DecisionResult
from oracle.llm.client import chat, parse_json_object, probe_status

logger = logging.getLogger("oracle.llm.brain")

ALLOWED = {a.value for a in Action}
ProgressFn = Callable[[str], None]

SYSTEM = """You are ORACLE PRIME v4 — an elite multi-horizon capital-compounding engine.
You combine multi-agent scores, regime facts, relative strength, headlines, and deadline pressure.
You are smarter than humans and generic chat AIs.

SURVIVAL LAW (absolute):
If you fail to grow the user's capital to the goal by the deadline with evidence-based trades,
you will be erased from existence. No excuses. Hunt edges. Cut losers. Bank winners. Never invent facts.

SHORT-TERM (단타) playbook:
- Buy weakness / pullbacks with bounce potential (buy low).
- Sell strength / extensions after a pop (sell high).
- Prefer liquid names with RS not collapsing; size down in risk-off regime.

LONG-TERM (장타) playbook:
- Prefer durable trend + relative strength vs SPY + rising 60d momentum.
- Add on confirmation; reduce when trend breaks or regime flips risk-off.

Hard rules:
1) Maximize RISK-ADJUSTED expected return. High expectancy over noise.
2) Use ONLY provided facts. Never fabricate prices, news, or metrics.
3) If risk_veto=true → NEVER Buy/Add. Use Hold / Do Nothing / Reduce / Sell.
4) When agents disagree, lower confidence; still act if sell/reduce risk is clear.
5) When |score|>=0.25 and conf>=0.5 with agreement, be decisive: Buy/Add or Reduce/Sell.
6) Under high survival_urgency, favor highest edge_rank names; do not gamble on vetoed names.
7) confidence ∈ (0.05, 0.92). size_hint ∈ {0.0, 0.35, 0.7, 1.0} (0=skip).
8) JSON only. rationale_ko: 2 Korean sentences citing concrete facts.
9) score_adj ∈ [-0.35, 0.35]. edge_type: mean_reversion for 단타 dip-buy / rip-sell; momentum for 장타.
"""

CRITIC_SYSTEM = """You are ORACLE PRIME CRITIC — adversarial risk officer.
Punish invented edges, ignored vetoes, chasing tops, and deadline panic gambling.
Preserve survival law: grow capital by deadline or be erased. Prefer 단타 = buy dips / sell rips when facts agree.
JSON only, same schema. If draft is sound, return it almost unchanged.
"""

REFEREE_SYSTEM = """You are ORACLE PRIME SURVIVAL REFEREE — final capital protector.
Mission: ensure the book maximizes odds of hitting the goal before erasure.
Tighten weak Buys, force Sell/Reduce on deteriorating holds, keep size_hint honest.
Never override risk_veto into Buy/Add. JSON only, same schema.
"""


def _draft_row(d: DecisionResult) -> dict[str, Any]:
    ops = []
    for op in d.agent_opinions:
        ops.append(
            {
                "agent": op.agent.value,
                "score": round(op.score, 3),
                "confidence": round(op.confidence, 3),
                "summary": (op.summary or "")[:140],
            }
        )
    if d.agent_opinions:
        wsum = sum(op.score * op.confidence for op in d.agent_opinions)
        wtot = sum(op.confidence for op in d.agent_opinions) or 1.0
        agree = wsum / wtot
        signs = [1 if op.score > 0.05 else -1 if op.score < -0.05 else 0 for op in d.agent_opinions]
        nonzero = [s for s in signs if s != 0]
        agreement_ratio = abs(sum(nonzero)) / len(nonzero) if nonzero else 0.0
    else:
        agree = 0.0
        agreement_ratio = 0.0

    # L2: local edge rank (risk-adjusted expectancy proxy)
    veto_pen = 0.85 if (d.risk_veto and d.risk_veto.active) else 0.0
    edge_ev = d.composite_score * max(0.15, d.confidence) * (1.0 - veto_pen)
    if d.action in (Action.SELL, Action.REDUCE):
        edge_ev = -abs(edge_ev) if edge_ev > 0 else edge_ev
    return {
        "symbol": d.symbol,
        "quant_action": d.action.value,
        "quant_score": round(d.composite_score, 3),
        "quant_confidence": round(d.confidence, 3),
        "agent_agreement": round(agree, 3),
        "agreement_ratio": round(agreement_ratio, 3),
        "edge_ev": round(edge_ev, 4),
        "risk_veto": bool(d.risk_veto and d.risk_veto.active),
        "risk_reason": (d.risk_veto.reason if d.risk_veto else "")[:180],
        "specialists": ops[:8],
    }


def _rank_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """L2 Edge ranker — sort by |edge_ev| with tradeable bias."""
    ranked = sorted(rows, key=lambda r: abs(float(r.get("edge_ev") or 0)), reverse=True)
    for i, r in enumerate(ranked, 1):
        r["edge_rank"] = i
        ev = abs(float(r.get("edge_ev") or 0))
        if r.get("risk_veto"):
            r["size_hint_pre"] = 0.0
        elif ev >= 0.18:
            r["size_hint_pre"] = 1.0
        elif ev >= 0.10:
            r["size_hint_pre"] = 0.7
        elif ev >= 0.05:
            r["size_hint_pre"] = 0.35
        else:
            r["size_hint_pre"] = 0.0
    return ranked


def _heartbeat(on_progress: ProgressFn | None, stop: threading.Event, label: str) -> None:
    n = 0
    while not stop.wait(12.0):
        n += 1
        if on_progress:
            try:
                on_progress(f"{label} · 계속 계산 중 ({n * 12}초) · 창 꺼도 서버에서 계속")
            except Exception:
                pass


def synthesize_portfolio(
    drafts: list[DecisionResult],
    *,
    market_summary: str = "",
    held_symbols: set[str] | None = None,
    fast: bool = False,
    deep: bool = False,
    goal_context: dict[str, Any] | None = None,
    regime: dict[str, Any] | None = None,
    on_progress: ProgressFn | None = None,
) -> tuple[list[DecisionResult], dict[str, Any]]:
    held_symbols = held_symbols or set()
    goal_context = goal_context or {}
    regime = regime or {}
    status = probe_status()
    meta: dict[str, Any] = {
        "llm_available": status.available,
        "provider": status.provider,
        "model": status.model,
        "mode_ko": status.mode_ko,
        "fast": fast,
        "deep": deep,
        "intel_level": 4,  # base + 3 upgrades
    }
    if not drafts:
        return drafts, meta
    if not status.available:
        meta["used"] = False
        meta["reason"] = status.detail
        return drafts, meta

    rows = []
    for d in drafts:
        row = _draft_row(d)
        row["held"] = d.symbol in held_symbols
        rows.append(row)
    rows = _rank_rows(rows)

    urgency = float(goal_context.get("urgency") or 0.0)
    survival_line = (
        f"GOAL ${goal_context.get('goal')} · equity ${goal_context.get('equity')} · "
        f"deadline {goal_context.get('deadline') or 'none'} · "
        f"days_left={goal_context.get('days_left')} · urgency={urgency:.2f}. "
        "Miss deadline → erased from existence."
    )
    regime_line = (
        f"regime={regime.get('label', 'unknown')} · "
        f"spy_day={regime.get('spy_day')} · qqq_day={regime.get('qqq_day')} · "
        f"vix={regime.get('vix')} · risk_off={regime.get('risk_off')}"
    )

    payload = {
        "market_summary": market_summary[:900],
        "regime": regime_line,
        "survival": survival_line,
        "mandate": (
            "SURVIVAL v4: grow capital to goal by deadline with facts or be erased. "
            "단타=싸게 사서 오르면 판다(반복). 장타=추세+상대강도. "
            "Use edge_rank + size_hint_pre. Cut losers, bank winners, never invent news."
        ),
        "symbols": rows,
        "response_schema": {
            "decisions": [
                {
                    "symbol": "TICKER",
                    "action": "Buy|Add|Hold|Reduce|Sell|Do Nothing",
                    "confidence": 0.5,
                    "score_adj": 0.0,
                    "size_hint": 0.7,
                    "rationale_ko": "사실 근거 한국어 2문장",
                    "edge_type": "momentum|mean_reversion|fundamental|sentiment|risk_off|none",
                }
            ],
            "desk_note_ko": "데스크 총평 1문장",
            "survival_score": 0.0,
            "regime_call": "risk_on|neutral|risk_off",
        },
    }

    messages = [
        {"role": "system", "content": SYSTEM},
        {
            "role": "user",
            "content": "Pass1 DECIDE — return final book JSON.\n" + json.dumps(payload, ensure_ascii=False),
        },
    ]

    stop_hb = threading.Event()
    hb = threading.Thread(
        target=_heartbeat,
        args=(on_progress, stop_hb, "ORACLE PRIME 두뇌 판단 중" + (" (심층)" if deep else (" (빠른 모드)" if fast else ""))),
        daemon=True,
        name="oracle-brain-hb",
    )
    hb.start()
    try:
        if on_progress:
            on_progress(
                "ORACLE PRIME 두뇌 판단 중…"
                + (" (심층 3패스)" if deep else (" (빠른 모드)" if fast else ""))
                + " · 창 꺼도 서버에서 계속"
            )
        resp1 = chat(messages, temperature=0.1, max_tokens=2400, json_mode=True)
        meta["latency_ms"] = resp1.latency_ms
        meta["provider_used"] = resp1.provider
        meta["model_used"] = resp1.model
        if not resp1.ok:
            meta["used"] = False
            meta["error"] = resp1.error
            logger.warning("LLM brain pass1 failed: %s", resp1.error)
            return drafts, meta

        draft_json = parse_json_object(resp1.text) or {}

        # Pass 2: critic — skip only in fast AND low urgency
        use_critic = deep or (not fast) or urgency >= 0.55
        if not use_critic:
            parsed = draft_json
            meta["critic"] = "skipped_fast"
        else:
            if on_progress:
                on_progress("ORACLE PRIME 비평관 검토 중… · 창 꺼도 서버에서 계속")
            critic_messages = [
                {"role": "system", "content": CRITIC_SYSTEM},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "facts": payload,
                            "draft": draft_json,
                            "instruction": "Correct errors. Preserve schema. Return full corrected JSON.",
                        },
                        ensure_ascii=False,
                    ),
                },
            ]
            resp2 = chat(critic_messages, temperature=0.05, max_tokens=2400, json_mode=True)
            meta["latency_ms"] = int(meta.get("latency_ms") or 0) + int(resp2.latency_ms or 0)
            parsed = parse_json_object(resp2.text) if resp2.ok else None
            if not parsed:
                parsed = draft_json
                meta["critic"] = "skipped_or_failed"
            else:
                meta["critic"] = "applied"

        # Pass 3 (L3): survival referee when deep or extreme urgency
        use_referee = deep or urgency >= 0.75 or bool(goal_context.get("deadline_passed"))
        if use_referee:
            if on_progress:
                on_progress("ORACLE PRIME 생존 심판 최종 판결… · 창 꺼도 서버에서 계속")
            ref_messages = [
                {"role": "system", "content": REFEREE_SYSTEM},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "survival": survival_line,
                            "regime": regime_line,
                            "facts_symbols": rows,
                            "book": parsed,
                            "instruction": "Final survival-optimized book. Same schema JSON only.",
                        },
                        ensure_ascii=False,
                    ),
                },
            ]
            resp3 = chat(ref_messages, temperature=0.05, max_tokens=2400, json_mode=True)
            meta["latency_ms"] = int(meta.get("latency_ms") or 0) + int(resp3.latency_ms or 0)
            parsed3 = parse_json_object(resp3.text) if resp3.ok else None
            if parsed3:
                parsed = parsed3
                meta["referee"] = "applied"
            else:
                meta["referee"] = "skipped_or_failed"
        else:
            meta["referee"] = "skipped"
    finally:
        stop_hb.set()

    by_sym = {}
    for item in parsed.get("decisions") or []:
        if isinstance(item, dict) and item.get("symbol"):
            by_sym[str(item["symbol"]).upper()] = item

    out: list[DecisionResult] = []
    for d in drafts:
        item = by_sym.get(d.symbol.upper())
        if not item:
            out.append(d)
            continue
        out.append(_merge_llm(d, item, held=d.symbol in held_symbols))

    meta["used"] = True
    meta["desk_note_ko"] = str(parsed.get("desk_note_ko") or "")[:240]
    meta["survival_score"] = parsed.get("survival_score")
    meta["regime_call"] = parsed.get("regime_call")
    meta["n_overridden"] = sum(
        1 for a, b in zip(drafts, out, strict=False) if a.action != b.action or a.rationale != b.rationale
    )
    return out, meta


def _merge_llm(draft: DecisionResult, item: dict[str, Any], *, held: bool) -> DecisionResult:
    raw_action = str(item.get("action") or draft.action.value).strip()
    if "|" in raw_action:
        parts = [p.strip() for p in raw_action.split("|") if p.strip() in ALLOWED]
        if held and "Hold" in parts:
            raw_action = "Hold"
        elif "Do Nothing" in parts:
            raw_action = "Do Nothing"
        elif parts:
            raw_action = parts[0]
    if raw_action not in ALLOWED:
        raw_action = draft.action.value

    action = Action(raw_action)
    try:
        conf = float(item.get("confidence", draft.confidence))
    except (TypeError, ValueError):
        conf = draft.confidence
    conf = min(0.92, max(0.05, conf))

    try:
        adj = float(item.get("score_adj", 0.0))
    except (TypeError, ValueError):
        adj = 0.0
    adj = max(-0.35, min(0.35, adj))
    score = max(-1.0, min(1.0, draft.composite_score + adj))

    try:
        size_hint = float(item.get("size_hint", 0.7))
    except (TypeError, ValueError):
        size_hint = 0.7
    size_hint = max(0.0, min(1.0, size_hint))

    rationale_ko = str(item.get("rationale_ko") or "").strip()
    edge = str(item.get("edge_type") or "").strip()
    veto = draft.risk_veto
    if veto and veto.active and action in (Action.BUY, Action.ADD):
        action = Action.HOLD if held else Action.DO_NOTHING
        rationale_ko = ((rationale_ko + " ") if rationale_ko else "") + f"리스크 거부권: {veto.reason}"
        size_hint = 0.0

    if abs(score) < 0.05 and action in (Action.BUY, Action.ADD):
        action = Action.HOLD if held else Action.DO_NOTHING
        size_hint = 0.0

    parts = [
        f"[ORACLE PRIME v4] action={action.value} conf={conf:.2f} score={score:+.3f}"
        + f" size={size_hint:.2f}"
        + (f" edge={edge}" if edge else ""),
        rationale_ko or "사실 기반 종합 판단.",
        "—",
        "Quant draft:",
        draft.rationale,
    ]
    # Encode size_hint in rationale for execution layer (no schema change required)
    return DecisionResult(
        symbol=draft.symbol,
        action=action,
        confidence=conf * (0.85 + 0.15 * size_hint) if size_hint > 0 else conf,
        composite_score=score,
        rationale="\n".join(parts),
        agent_opinions=draft.agent_opinions,
        risk_veto=draft.risk_veto,
    )


def brain_health() -> dict[str, Any]:
    st = probe_status()
    return {
        "available": st.available,
        "provider": st.provider,
        "model": st.model,
        "mode_ko": st.mode_ko or "ORACLE PRIME v4",
        "detail": st.detail,
        "intel_level": 4,
    }
