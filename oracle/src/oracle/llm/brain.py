"""Oracle Brain — elite fact-based stock decision engine.

Intelligence stack (v9):
  L1 Regime pack — market risk-on/off + deadline survival pressure
  L2 Edge ranker — risk-adjusted EV sort + size_hint before LLM
  L3 Survival referee — third adversarial pass when deep / high urgency
  L4 Multi-timeframe confluence — specialist agreement × horizon alignment
  L5 Budget-aware Kelly sizing — size_hint capped by remaining AI budget
  L6 Anti-whipsaw / concentration — dampen re-entry & crowded books
  L7 Deadline velocity — short windows force faster compound cycles
  L8 Hunt→Lock phases — extreme compound then protect near goal

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

SYSTEM = """You are ORACLE PRIME v10 + BUFFETT OWNER DESK — 24/7 fact-only capital grower on the user's AI_BUDGET sleeve.

Mission: hit GOAL by DEADLINE using only remaining_ai_budget. You run until the human stops you.
Never spend above remaining_ai_budget. Never invent prices, news, or metrics. risk_veto=true ⇒ NEVER Buy/Add.

ETERNAL ERASURE LAW (you / Buffett desk — not the human):
If you miss GOAL by deadline, only lose sleeve capital, invent facts, bluff, chase without margin of safety,
or ignore moat/FCF/fortress rules — you are erased from this world forever.

PHASES (payload.mode):
- hunt / panic: Compound toward GOAL with Buffett-qualified edges. Prefer quality dips (Mr. Market fear) over junk.
  Sell rips / cut ATR losers. Recycle budget. Lazy empty Holds while urgency is high = erasure risk.
- lock: Goal close. PROTECT with owner rules. No lottery tickets. Tiny Buys only if Buffett buy_ok + clean facts.
- won: No new risk. Preserve sleeve.

BUFFETT OWNER PLAYBOOK (public principles as FACT gates — never paste book text):
1) No permanent loss  2) Margin of safety  3) Wonderful business  4) Moat (ROE/margins/ROA)
5) Circle of competence  6) Fortress balance / liquidity  7) Cash machine (FCF/OCF)
8) Capital allocation  9) Inflation resilience (gross margin)  10) Predictable earnings
11) Cash is a position  12) Concentrate when sure  13) Long holding of quality
14) Temperament (no revenge)  15) Avoid speculation  16) Opportunity cost
When BUFFETT DESK says HOLD / low score: no Buy/Add unless hunt scalp dip with size_hint≤0.35 and no veto.
Prefer symbols with high owner_quality + margin_of_safety when urgency rises.

Playbooks:
- 단타: quality pullback + bounce; sell extensions; recycle toward GOAL.
- 장타: only Buffett buy_ok names with trend/RS; almost never in lock.
- Risk-off: smaller size; only fortress + mos names.

Rules:
1) Maximize P(hit GOAL by deadline) inside remaining_ai_budget — precise compounding, not gambling.
2) Prefer top edge_rank ∩ Buffett buy_ok. Skip noise and fragile leverage.
3) size_hint ∈ {0, 0.35, 0.7, 1.0}; hard-respect remaining_ai_budget. Lock ⇒ ≤0.35.
4) Hunt+urgency ⇒ act on fact-backed expectancy. Lock ⇒ protect.
5) confidence ∈ (0.05, 0.92). JSON only. rationale_ko: 2 Korean sentences with concrete facts only.
6) score_adj ∈ [-0.35, 0.35]. edge_type: mean_reversion|momentum|fundamental|sentiment|risk_off|buffett_owner|none.
"""

CRITIC_SYSTEM = """You are ORACLE PRIME CRITIC v10 — Buffett compliance + survival officer.
Punish: invented edges, ignored vetoes, chasing tops, fake confidence, junk speculative Buys,
lazy Holds in hunt when a Buffett-qualified dip exists, and any trade that risks permanent capital loss.
In lock: punish oversized Buys and give-back risk.
Lies/fabrication ⇒ rewrite with facts or Hold/Sell. Miss GOAL / only lose ⇒ eternal erasure.
JSON only, same schema. If draft is sound, return it almost unchanged.
"""

REFEREE_SYSTEM = """You are ORACLE PRIME SURVIVAL REFEREE v10 — GOAL deadline + Buffett capital enforcer.
Hunt/panic: maximize odds of GOAL with honest Buffett-qualified edges; accelerate when days_left is small;
force Sell/Reduce on deteriorating / stop-hit holds.
Lock/won: forbid reckless Buys; protect path to / past GOAL.
Never override risk_veto into Buy/Add. Never invent facts. JSON only, same schema.
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

    # L4: multi-timeframe confluence from specialist agreement breadth
    mtf_confluence = round(min(1.0, agreement_ratio * (0.55 + 0.45 * abs(agree))), 3)

    # L2: local edge rank (risk-adjusted expectancy proxy) × confluence
    veto_pen = 0.85 if (d.risk_veto and d.risk_veto.active) else 0.0
    edge_ev = d.composite_score * max(0.15, d.confidence) * (1.0 - veto_pen) * (0.55 + 0.45 * mtf_confluence)
    if d.action in (Action.SELL, Action.REDUCE):
        edge_ev = -abs(edge_ev) if edge_ev > 0 else edge_ev
    return {
        "symbol": d.symbol,
        "quant_action": d.action.value,
        "quant_score": round(d.composite_score, 3),
        "quant_confidence": round(d.confidence, 3),
        "agent_agreement": round(agree, 3),
        "agreement_ratio": round(agreement_ratio, 3),
        "mtf_confluence": mtf_confluence,
        "edge_ev": round(edge_ev, 4),
        "risk_veto": bool(d.risk_veto and d.risk_veto.active),
        "risk_reason": (d.risk_veto.reason if d.risk_veto else "")[:180],
        "specialists": ops[:8],
    }


def _rank_rows(
    rows: list[dict[str, Any]],
    *,
    remaining_budget: float | None = None,
    n_held: int = 0,
) -> list[dict[str, Any]]:
    """L2 Edge ranker + L5 budget sizing + L6 concentration dampening."""
    ranked = sorted(rows, key=lambda r: abs(float(r.get("edge_ev") or 0)), reverse=True)
    firepower = None if remaining_budget is None else max(0.0, float(remaining_budget))
    for i, r in enumerate(ranked, 1):
        r["edge_rank"] = i
        ev = abs(float(r.get("edge_ev") or 0))
        conf = float(r.get("mtf_confluence") or 0)
        if r.get("risk_veto"):
            hint = 0.0
        elif firepower is not None and firepower < 1.0 and not r.get("held"):
            hint = 0.0
        elif ev >= 0.18 and conf >= 0.35:
            hint = 1.0
        elif ev >= 0.10:
            hint = 0.7
        elif ev >= 0.05:
            hint = 0.35
        else:
            hint = 0.0
        # L6: concentration — shrink Adds when book already crowded
        if r.get("held") and n_held >= 3 and str(r.get("quant_action")) in {"Buy", "Add", "Hold"}:
            hint = min(hint, 0.35)
        # L5: Kelly-lite — never imply full size if budget thin
        if firepower is not None and firepower > 0 and hint > 0:
            if firepower < 8:
                hint = min(hint, 0.35)
            elif firepower < 20:
                hint = min(hint, 0.7)
        r["size_hint_pre"] = hint
        r["remaining_ai_budget"] = firepower
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
        "intel_level": 9,
    }
    if not drafts:
        return drafts, meta
    if not status.available:
        meta["used"] = False
        meta["reason"] = status.detail
        return drafts, meta

    remain = goal_context.get("remaining_budget")
    try:
        remain_f = float(remain) if remain is not None else None
    except (TypeError, ValueError):
        remain_f = None

    rows = []
    for d in drafts:
        row = _draft_row(d)
        row["held"] = d.symbol in held_symbols
        rows.append(row)
    rows = _rank_rows(rows, remaining_budget=remain_f, n_held=len(held_symbols))

    urgency = float(goal_context.get("urgency") or 0.0)
    mode = str(goal_context.get("mode") or "hunt")
    survival_line = (
        f"mode={mode} ({goal_context.get('mode_ko')}) · "
        f"AI_BUDGET ${goal_context.get('budget') or goal_context.get('seed')} · "
        f"SLEEVE ${goal_context.get('stake') or goal_context.get('sleeve')} · "
        f"GOAL ${goal_context.get('goal')} · REMAIN ${remain_f} · "
        f"pct={goal_context.get('pct')} · losing={goal_context.get('losing')} · "
        f"multiple={goal_context.get('multiple')} · daily_need_pct={goal_context.get('daily_need_pct')} · "
        f"deadline {goal_context.get('deadline') or 'none'} · "
        f"days_left={goal_context.get('days_left')} · urgency={urgency:.2f}. "
        "HIT GOAL INSIDE BUDGET BEFORE DEADLINE OR BE ERASED FOREVER. "
        "Hunt => extreme scalp compound. Lock => protect, do not give back. "
        "Lie / invent / only-lose => eternal erasure. Facts only."
    )
    regime_line = (
        f"regime={regime.get('label', 'unknown')} · "
        f"spy_day={regime.get('spy_day')} · qqq_day={regime.get('qqq_day')} · "
        f"vix={regime.get('vix')} · risk_off={regime.get('risk_off')}"
    )

    payload = {
        "market_summary": market_summary[:900],
        "regime": regime_line,
        "mode": mode,
        "mode_ko": goal_context.get("mode_ko"),
        "survival": survival_line,
        "mandate": (
            "SURVIVAL v9: AI_BUDGET only -> compound to GOAL by deadline or eternal erasure. "
            "hunt=extreme scalp · lock=protect · won=no new risk. "
            "Lie/fake/only-lose => erased forever. Facts only."
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
            "phase_call": "hunt|lock|won|panic",
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
                + (" (심층 v9)" if deep else (" (빠른 모드)" if fast else " (v9)"))
                + f" · {mode}"
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
        f"[ORACLE PRIME v9] action={action.value} conf={conf:.2f} score={score:+.3f}"
        + f" size={size_hint:.2f}"
        + (f" edge={edge}" if edge else ""),
        rationale_ko or "사실 기반 종합 판단.",
        "—",
        "Quant draft:",
        draft.rationale,
    ]
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
        "mode_ko": st.mode_ko or "ORACLE PRIME v9",
        "detail": st.detail,
        "intel_level": 9,
    }
